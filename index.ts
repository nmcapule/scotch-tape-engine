const SALES_SPREADSHEET_ID = "...snip...";
const GRAB_SHEET_ID = "GRAB";

type DateString = string;

interface GrabSales {
  date?: DateString;
  originalPrice?: number;
  amount?: number;
  less?: number;
  total?: number;
}

type Sales = {
  date?: DateString;
  [key: string]: any;
};

class DailySalesSummary {
  constructor(
    readonly date: DateString,
    readonly sales: Sales,
    readonly grabSales?: GrabSales
  ) {}

  get gross() {
    return this.sales["Total Gross:"];
  }

  get profit() {
    return this.sales["Profit:"];
  }

  get grabGross() {
    return this.grabSales?.amount;
  }

  get grabProfit() {
    return this.grabSales?.total;
  }

  get simple() {
    return {
      date: this.date,
      sales: {
        gross: this.gross,
        profit: this.profit,
      },
      grab: {
        gross: this.grabGross,
        profit: this.grabProfit,
      },
    };
  }
}

function main() {
  let grabSalesLookup = new Map<DateString, GrabSales>();
  let salesLookup = new Map<DateString, Sales>();

  const spreadsheet = SpreadsheetApp.openById(SALES_SPREADSHEET_ID);
  for (const sheet of spreadsheet.getSheets()) {
    const sheetName = sheet.getSheetName();
    if (sheetName === GRAB_SHEET_ID) {
      Logger.log(`Parsing GRAB sheet...`);
      grabSalesLookup = extractDailyGrabSales(sheet);
    } else {
      const monthDate = parseDailySalesSheetName(sheetName);
      if (!monthDate) {
        continue;
      }
      Logger.log(`Parsing daily sales sheet ${sheetName}...`);
      extractDailySales(sheet).forEach((v, k) => salesLookup.set(k, v));
    }
  }

  const dailySales = Array.from(salesLookup.entries())
    .map(
      ([date, sales]) =>
        new DailySalesSummary(date, sales, grabSalesLookup.get(date))
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((entry) => {
      Logger.log(JSON.stringify(entry.simple, null, 2));
    });
}

function extractDailyGrabSales(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
  const headers = sheet.getDataRange().getDisplayValues()[0];
  const layouts = headers.reduce((accumulator, curr, i) => {
    let layout = accumulator.slice(-1).pop();
    if (!layout || curr === "DATE") {
      layout = {};
      accumulator.push(layout);
    }
    if (curr) {
      layout[curr] = i;
    }
    return accumulator;
  }, [] as Array<{ [key: string]: number }>);

  const output: GrabSales[] = [];
  const rows = sheet.getDataRange().getValues().slice(1);
  for (const row of rows) {
    for (const layout of layouts) {
      output.push({
        date: extractDate(row[layout["DATE"]]),
        amount: row[layout["Amount"]],
        less: row[layout["25%"]],
        originalPrice: row[layout["Original Price"]],
        total: row[layout["Total"]],
      });
    }
  }

  return output
    .filter((gs) => gs.date)
    .reduce(
      (acc, curr) => acc.set(curr.date!, curr),
      new Map<DateString, GrabSales>()
    );
}

function extractDailySales(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
  const values = sheet.getDataRange().getValues();

  const headers = values[1];
  const colsLayout = headers.reduce(
    (acc: Map<DateString, number>, curr, col) => {
      const parsedDate = extractDate(curr);
      if (parsedDate) {
        return acc.set(parsedDate, col);
      }
      return acc;
    },
    new Map<DateString, number>()
  );

  const subheaders = values.reduce((acc, [title, subtitle]) => {
    const prev = acc.slice(-1).pop() ?? [];
    if (!title && !subtitle) {
      acc.push(["", ""]);
    } else {
      acc.push([title.toString() || prev[0] || "", subtitle.toString()]);
    }
    return acc;
  }, [] as Array<[string, string]>);
  const rowsLayout = subheaders.reduce(
    (acc: Map<string, number>, [title, subtitle], row) => {
      if (!title && !subtitle) {
        return acc;
      }
      return acc.set(`${title}:${subtitle}`, row);
    },
    new Map<string, number>()
  );

  return Array.from(colsLayout.entries()).reduce((acc, [date, col]) => {
    const sales = Array.from(rowsLayout.entries()).reduce(
      (acc, [key, row]) => ({
        ...acc,
        [key]: values[row][col],
      }),
      {} as Sales
    );
    return acc.set(date, sales);
  }, new Map<DateString, Sales>());
}

function parseDailySalesSheetName(sheetName: string) {
  const SHEET_RE = /Daily Sales - (?<month>\w{3} \d{4})/;
  const month = sheetName.match(SHEET_RE)?.groups?.["month"];
  if (!month) {
    return null;
  }
  return new Date(month);
}

const PREFERRED_TIME_ZONE = "Asia/Manila";
const PREFERRED_DATE_FORMAT = "yyyy-MM-dd";

function formatDate(date: Date) {
  return Utilities.formatDate(date, PREFERRED_TIME_ZONE, PREFERRED_DATE_FORMAT);
}

function extractDate(value: any) {
  if (value instanceof Date) {
    return formatDate(value);
  }
  if (typeof value === "string") {
    const DATE_RE = /^\d+\/\d+\/\d+$/;
    if (value.match(DATE_RE)) {
      return formatDate(new Date(value));
    }
  }
}
