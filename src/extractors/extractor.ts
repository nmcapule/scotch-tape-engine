export interface ExtractionHeadersSpecs<T = any> {
  // Extract all the headers in this dimension-wise index.
  index: number;
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
    rowwise: ExtractionHeadersSpecs[];
  };
}

export class HeaderLayout {
  constructor(readonly keys: any[], readonly index: number) {}

  get isComplete() {
    return this.keys.every((e) => Boolean(e));
  }

  get serialized() {
    return this.keys.join("$");
  }
}

export class Extractor {
  constructor(
    readonly sheet: GoogleAppsScript.Spreadsheet.Sheet,
    readonly specs: ExtractionSpecs
  ) {}

  extract() {
    const values = this.sheet.getDataRange().getValues();
    const cwhlayout = this.parseLayout(
      this.specs.headers.colwise,
      (idx) => values[idx]
    );
    const rwhlayout = this.parseLayout(this.specs.headers.rowwise, (idx) =>
      values.map((r) => r[idx])
    );

    const output: any[] = [];
    for (const cwh of cwhlayout) {
      const col = cwh.index;
      for (const rwh of rwhlayout) {
        const row = rwh.index;
        output.push({ cwh: cwh.keys, rwh: rwh.keys, value: values[row][col] });
      }
    }
    return output;
  }

  private parseLayout(
    specs: ExtractionHeadersSpecs[],
    headersGetter: (idx) => any[]
  ) {
    return specs
      .map((cwh) => {
        let headers = headersGetter(cwh.index);
        if (cwh.cascading) {
          headers = cascade(headers);
        }
        return headers.map((h, i) => ({
          exclude: cwh.exclude?.(h, i),
          label: cwh.transform?.(h, i) ?? h,
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
          arr.map((e) => e.label),
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
