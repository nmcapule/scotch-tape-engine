import { Extractor } from "./extractors/extractor";

function main() {
  const sheet = SpreadsheetApp.openById(
    "1Zgr8J9V4xoB2HfOJ9hSew2IkFCBQz5irQHVUJoFER2M"
  ).getSheetByName("Attendance");
  const extractor = new Extractor(sheet!, {
    headers: {
      colwise: [
        {
          index: 0,
          cascading: true,
          label: "employee",
        },
        {
          index: 1,
          label: "subcolumns",
        },
      ],
      rowwise: [
        {
          index: 1,
          label: "date",
        },
      ],
    },
  });
  Logger.log(JSON.stringify(extractor.extract(), null, 4));
}

globalThis.main = main;
