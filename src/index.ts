import { Extractor } from "./extractors/extractor";

function main() {
  const sheet = SpreadsheetApp.openById(
    "1Zgr8J9V4xoB2HfOJ9hSew2IkFCBQz5irQHVUJoFER2M"
  ).getSheetByName("Employee Compensation");
  const extractor = new Extractor(sheet!, {
    headers: {
      colwise: [
        {
          index: 93,
          cascading: true,
          label: "column",
        },
      ],
      // rowwise: [
      //   {
      //     index: 1,
      //     label: "date",
      //   },
      // ],
    },
  });
  const extracted = Object.values(
    extractor.extract().reduce((acc: Record<string, any>, curr) => {
      const group = curr.keys["$row"];
      const prop = curr.keys["column"];

      const record = acc[group] ?? {};
      record[prop] = curr.value;
      acc[group] = record;

      return acc;
    }, {} as Record<any, Record<string, any>>)
  )
    .filter((entry) => Boolean(entry["TIN Number"]))
    .sort((a, b) => a["TIN Number"].localeCompare(b["TIN Number"]));
  Logger.log(JSON.stringify(extracted, null, 4));
}

globalThis.main = main;
