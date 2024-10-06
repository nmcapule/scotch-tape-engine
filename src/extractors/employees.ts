import { EMPLOYEE_SPREADSHEET_ID } from "../config";

export class EmployeeRecordsExtractor {
  spreadsheet = SpreadsheetApp.openById(EMPLOYEE_SPREADSHEET_ID);

  getEmployees() {}

  getAttendances() {
    const values = this.spreadsheet.getDataRange().getValues();
    const employeeHeaders = values[0].reduce((accumulator: string[], curr) => {
      const last = accumulator.slice(-1)[0];
      accumulator.push(curr ?? last ?? "");
      return accumulator;
    }, [] as string[]);
    // const headers = values[1]
  }
}
