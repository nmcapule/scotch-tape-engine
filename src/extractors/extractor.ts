export interface ExtractionHeadersSpecs<T = any> {
  // Extract all the headers in this dimension-wise index.
  index?: number;
  // Cascade the header value to the next empty cells.
  cascading?: boolean;
  // Human label for this header.
  label: string;
  // Exclude headers passing this predicate.
  exclude?: (v: any, i: number) => boolean;
  // Transforms each header.
  transform?: (v: any, i: number) => T;
}

export interface ExtractionSpecs {
  headers: {
    colwise: ExtractionHeadersSpecs[];
    rowwise?: ExtractionHeadersSpecs[];
  };
  isWithinRange?: (row: number, col: number) => Boolean;
}

export class HeaderLayout {
  constructor(readonly keys: Record<string, any>, readonly index: number) {}

  get isComplete() {
    return Object.values(this.keys).every((e) => e !== "");
  }
}

export class Extractor {
  constructor(
    readonly sheet: GoogleAppsScript.Spreadsheet.Sheet,
    readonly specs: ExtractionSpecs
  ) {}

  extract() {
    const values = this.sheet.getDataRange().getValues();
    const displayValues = this.sheet.getDataRange().getDisplayValues();

    const cwhLayout = this.parseLayout(
      [{ label: "$col" }, ...(this.specs.headers.colwise || [])],
      (idx) => values[idx]
    );
    const rwhLayout = this.parseLayout(
      [{ label: "$row" }, ...(this.specs.headers.rowwise || [])],
      (idx) => values.map((r) => r[idx])
    );

    const minRow = Math.max(
      -1,
      ...(this.specs.headers.colwise.map((h) => h.index ?? -1) || [])
    );
    const minCol = Math.max(
      -1,
      ...(this.specs.headers.rowwise?.map((h) => h.index ?? -1) || [])
    );
    const isWithinRange =
      this.specs.isWithinRange ?? ((row, col) => row > minRow && col > minCol);

    const output: any[] = [];
    for (const cwh of cwhLayout) {
      const col = cwh.index;
      for (const rwh of rwhLayout) {
        const row = rwh.index;
        if (!isWithinRange(row, col)) {
          continue;
        }
        output.push({
          keys: {
            ...cwh.keys,
            ...rwh.keys,
          },
          value: values[row][col],
          displayValue: displayValues[row][col],
        });
      }
    }
    return output;
  }

  private parseLayout(
    specs: ExtractionHeadersSpecs[],
    headersGetter: (idx) => any[]
  ) {
    return specs
      .map((spec) => {
        let headers = headersGetter(spec.index);
        // If index is not defined, treat this as extracting index value.
        if (spec.index === undefined) {
          headers = headersGetter(0).map((_, i) => i);
        }
        if (spec.cascading) {
          headers = cascade(headers);
        }
        return headers.map((h, i) => ({
          exclude: spec.exclude?.(h, i),
          label: spec.transform?.(h, i) ?? h,
          header: spec.label,
        }));
      })
      .reduce((acc, curr) => {
        const embedded = embedAll(curr);
        if (acc.length === 0) {
          return embedded;
        }
        return acc.map((arr: any[], i) => arr.concat(embedded[i]));
      }, [] as any[][])
      .map((arr, i) => {
        if (!arr.every((e) => !e.exclude)) {
          return null;
        }
        return new HeaderLayout(
          arr.reduce(
            (acc, curr) => ({
              ...acc,
              [curr.header]: curr.label,
            }),
            {} as Record<string, any>
          ),
          i
        );
      })
      .filter((e) => e && e.isComplete) as HeaderLayout[];
  }
}

/** Spreads out the headers to the next cell. */
function cascade<T>(arr: T[], fallback = null as T) {
  return arr.reduce((acc: T[], curr) => {
    const last = acc.slice(-1)[0];
    acc.push(curr || last || fallback);
    return acc;
  }, [] as T[]);
}

/** Embeds each element of an array into an inner array. */
function embedAll<T>(arr: T[]) {
  return arr.map((e) => [e]);
}
