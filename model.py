from dataclasses import dataclass, asdict
import openpyxl
import json
import os
import datetime
import fpdf
from docx import Document


v0_1_template_constants = {
    'COMMENT_BANK_HEADER_ROWS': 3,
    'REPORT_DATA_HEADER_ROWS': 3,

    'STUDENT_LASTNAME_COL': 1,
    'STUDENT_FIRSTNAME_COL': 2,
    'STUDENT_GROUP_COL': 3,
    'STUDENT_NOTES_COL': 4,

    'RAW_COMMENT_COL': 5,
    'COMPILED_COMMENT_COL': 6,

    'DATA_VALUES_START_COL': 7,
    'DATA_VALUES_LABELS_ROW': 3
    
}


@dataclass
class Student:
    firstname: str
    lastname: str
    group: str
    notes: str


@dataclass
class Report:
    id: int
    raw_comment: str
    compiled_comment: str
    student: Student
    data_values: dict


@dataclass
class Comment:
    id: int
    label: str
    text: str
    category: str


class LoadExcelTemplateException(Exception):
    pass

class SaveExcelTemplateException(Exception):
    pass

class ExportReportSetException(Exception):
    pass

class ReportSet:

    def __init__(self, reports=[], comment_bank=[]):
        self.reports = reports
        self.comment_bank = comment_bank

    def reports_as_json(self):
        # TODO: Check if this is correct - should it just be {'reports': ... }?
        return json.dumps({self.reports: [asdict(r) for r in self.reports]})

    def comment_bank_as_json(self):
        return json.dumps({'comment_bank': [asdict(c) for c in self.comment_bank]})

    def report_set_as_json(self):
        return json.dumps(
            {
                'reports':[asdict(r) for r in self.reports],
                'comment_bank': [asdict(c) for c in self.comment_bank]
            }
        )

    def save_to_excel_template(self, path_to_saved_file=None):

        if len(self.reports) == 0:
            raise SaveExcelTemplateException("No report data to save!")

        if path_to_saved_file is None:
            path_to_saved_file = os.path.join('temp', f"ReportWriterExport_{datetime.datetime.strftime(datetime.datetime.now(),'%Y-%m-%d_%H%M%S.xlsx')}")

        doc = openpyxl.load_workbook(os.path.join('resources', 'template.xlsx'))
        template_version = doc["Info"]["B4"].value

        if template_version == 0.1:
            template_constants = v0_1_template_constants

        report_data = doc['Data entry']

        # Add Data Value labels
        for i, label in enumerate(self.reports[0].data_values.keys()):
            report_data.cell(template_constants['DATA_VALUES_LABELS_ROW'],
                             template_constants['DATA_VALUES_START_COL'] + i).value = label

        # Add report data
        for i, report in enumerate(self.reports):
            row = template_constants['REPORT_DATA_HEADER_ROWS'] + 1 + i
            report_data.cell(row, 1).value = report.student.lastname
            report_data.cell(row, 2).value = report.student.firstname
            report_data.cell(row, 3).value = report.student.group
            report_data.cell(row, 4).value = report.student.notes
            report_data.cell(row, 5).value = report.raw_comment
            report_data.cell(row, 6).value = report.compiled_comment
            report_data.cell(row, 7).value = report.compiled_comment

            # Add data values data
            for j, label in enumerate(report.data_values.keys()):
                report_data.cell(row, template_constants['DATA_VALUES_START_COL'] + j).value = report.data_values[label]

        # Add comment bank
        comment_data = doc['Comment bank']

        # TODO: Update to use new comment bank list
        for i, comment in enumerate(self.comment_bank):
            row = template_constants['COMMENT_BANK_HEADER_ROWS'] + 1 + i
            comment_data.cell(row, 1).value = comment.label
            comment_data.cell(row, 2).value = comment.text
            comment_data.cell(row, 3).value = comment.category

        # Save finished document
        doc.save(path_to_saved_file)

        # Return path to saved file
        return path_to_saved_file

    def export_to_txt(self, path_to_export_file=None):

        if len(self.reports) == 0:
            raise SaveExcelTemplateException("No report data to save!")

        if path_to_export_file == None:
            path_to_export_file = os.path.join('temp', f"ReportWriterExport_{datetime.datetime.strftime(datetime.datetime.now(),'%Y-%m-%d_%H%M%S.txt')}")

        with open(path_to_export_file, "w") as f:
            for report in self.reports:
                f.write(f"{report.student.firstname} {report.student.lastname} ({report.student.group})\n")
                f.write(f"{'=' * 80}\n")
                f.write(f"{report.compiled_comment}\n")
                f.write(f"{'-' * 80}\n\n")

        # Return path to saved file
        return path_to_export_file

    def export_to_pdf(self, path_to_export_file=None):
        if len(self.reports) == 0:
            raise SaveExcelTemplateException("No report data to save!")

        if path_to_export_file == None:
            path_to_export_file = os.path.join('temp', f"ReportWriterExport_{datetime.datetime.strftime(datetime.datetime.now(),'%Y-%m-%d_%H%M%S.pdf')}")

        pdf = fpdf.FPDF('P', 'mm', 'A4')
        pdf.add_page()

        for report in self.reports:
            pdf.set_font('Arial', 'B', 16)
            pdf.cell(0, 10, f"{report.student.firstname} {report.student.lastname} ({report.student.group})")
            pdf.ln(10)
            pdf.set_font('Arial', '', 12)
            pdf.multi_cell(0, 5, f"{report.compiled_comment}")
            pdf.ln(8)

        pdf.output(path_to_export_file, 'F')

        # Return path to saved file
        return path_to_export_file

    def export_to_word(self, path_to_export_file=None):

        if len(self.reports) == 0:
            raise SaveExcelTemplateException("No report data to save!")

        if path_to_export_file == None:
            path_to_export_file = os.path.join('temp', f"ReportWriterExport_{datetime.datetime.strftime(datetime.datetime.now(),'%Y-%m-%d_%H%M%S.docx')}")

        doc = Document()

        for report in self.reports:
            doc.add_heading(f"{report.student.firstname} {report.student.lastname} ({report.student.group})")
            doc.add_paragraph(f"{report.compiled_comment}")

        doc.save(path_to_export_file)

        # Return path to saved file
        return path_to_export_file

    @staticmethod
    def load_from_json(rs_json):
        rs = json.loads(rs_json)

        reports = [
            Report(r['id'],
                   r['raw_comment'],
                   r['compiled_comment'],
                   Student(
                       r['student']['firstname'],
                       r['student']['lastname'],
                       r['student']['group'],
                       r['student']['notes']
                   ),
                   r['data_values'])
            for r in rs['reports']
        ]

        comment_bank = [
            Comment(c['id'], c['label'], c['text'], c['category']) for c in rs['comment_bank']
        ]

        return ReportSet(reports=reports, comment_bank=comment_bank)

    @staticmethod
    def load_from_excel_template(template_path):

        try:
            xl_template = openpyxl.load_workbook(template_path, True)
            template_version = xl_template["Info"]["B4"].value

            if template_version == 0.1:
                template_constants = v0_1_template_constants

            # Build comment bank
            comment_data = xl_template["Comment bank"]

            # Count the number of rows until a blank is found in the comment bank sheet
            row = 1
            while (comment_data.cell(row, 1).value is not None):
                row += 1
            comment_count = row - template_constants['COMMENT_BANK_HEADER_ROWS'] - 1

            # TODO: Update to use new comment bank list
            comment_bank = []

            for i in range(1, comment_count + 1):
                if comment_data.cell(template_constants['COMMENT_BANK_HEADER_ROWS'] + i, 1).value is not None:
                    label = comment_data.cell(template_constants['COMMENT_BANK_HEADER_ROWS'] + i, 1).value
                    text = comment_data.cell(template_constants['COMMENT_BANK_HEADER_ROWS'] + i, 2).value
                    category = comment_data.cell(template_constants['COMMENT_BANK_HEADER_ROWS'] + i, 3).value

                    comment_bank.append(Comment(i,label, text, category))

            # Build list of reports
            report_data = xl_template["Data entry"]
            report_count = report_data.max_row - template_constants['REPORT_DATA_HEADER_ROWS']

            data_value_count = report_data.max_column - (template_constants['DATA_VALUES_START_COL'] - 1)

            data_value_count = 0
            col = template_constants['DATA_VALUES_START_COL']
            while report_data.cell(template_constants['DATA_VALUES_LABELS_ROW'],col).value != None:
                x = report_data.cell(template_constants['DATA_VALUES_LABELS_ROW'],col).value
                data_value_count += 1
                col += 1

            reports = []

            for row in range(template_constants['REPORT_DATA_HEADER_ROWS'] + 1,
                             template_constants['REPORT_DATA_HEADER_ROWS'] + report_count + 1):

                report_data_values = {}

                for col in range(template_constants['DATA_VALUES_START_COL'],
                                 template_constants['DATA_VALUES_START_COL'] + data_value_count):
                    report_data_values[report_data.cell(template_constants['DATA_VALUES_LABELS_ROW'], col).value] = \
                        report_data.cell(row, col).value

                reports.append(
                    Report(
                        id=row - template_constants['REPORT_DATA_HEADER_ROWS'],
                        raw_comment=report_data.cell(row, template_constants['RAW_COMMENT_COL']).value,
                        compiled_comment=report_data.cell(row, template_constants['COMPILED_COMMENT_COL']).value,
                        student=Student(
                            firstname=report_data.cell(row, template_constants['STUDENT_FIRSTNAME_COL']).value,
                            lastname=report_data.cell(row, template_constants['STUDENT_LASTNAME_COL']).value,
                            group=report_data.cell(row, template_constants['STUDENT_GROUP_COL']).value,
                            notes=report_data.cell(row, template_constants['STUDENT_NOTES_COL']).value
                        ),
                        data_values=report_data_values
                    )
                )

            return ReportSet(reports, comment_bank)

        except openpyxl.utils.exceptions.InvalidFileException as e:
            raise LoadExcelTemplateException(str(e))

        except FileNotFoundError as e:
            raise LoadExcelTemplateException(str(e))

        except Exception as e:
            raise e


if __name__ == '__main__':

    js = """
    {
       "reports": [
          {
             "id": 1,
             "raw_comment": "Adam's report is basically good. [ENG] [EOY]",
             "compiled_comment": "Adam's report is basically good. Adam engages well in lessons. Adam's mock result was 99%, compared to 88% for his end-of-year exam in Year 10.",
             "student": {
                "firstname": "Adam",
                "lastname": "Dimmick",
                "group": "12B",
                "notes": "Tilt"
             },
             "data_values": {
                "Y10 av": 89,
                "Y10 EOY": 88,
                "Y11 av": 97,
                "Y11 mock": 99
             }
          },
          {
             "id": 2,
             "raw_comment": "Louise's report",
             "compiled_comment": "Louise's compiled report",
             "student": {
                "firstname": "Louise",
                "lastname": "Dimmick",
                "group": "12B",
                "notes": "SEN"
             },
             "data_values": {
                "Y10 av": 87,
                "Y10 EOY": 68,
                "Y11 av": 77,
                "Y11 mock": 78
             }
          },
          {
             "id": 3,
             "raw_comment": "Jane's report",
             "compiled_comment": "Jane's compiled report",
             "student": {
                "firstname": "Bob",
                "lastname": "Jane",
                "group": "12B",
                "notes": null
             },
             "data_values": {
                "Y10 av": 69,
                "Y10 EOY": 72,
                "Y11 av": 75,
                "Y11 mock": 79
             }
          }
       ],
       "comment_bank": [
          {
             "id": 1,
             "label": "ENG",
             "text": "[name] engages well in lessons.",
             "category": "Engagement"
          },
          {
             "id": 2,
             "label": "EXC",
             "text": "[name] produces excellent work.",
             "category": "Work"
          },
          {
             "id": 3,
             "label": "EOY",
             "text": "[name]'s mock result was [Y11 mock]%, compared to [Y10 EOY]% for his end-of-year exam in Year 10.",
             "category": "Exams"
          },
          {
             "id": 4,
             "label": "TOTALLY NEW",
             "text": "A new comment to add",
             "category": "Engagement"
          }
       ]
    }"""

    rs = ReportSet.load_from_json(js)
    print(rs.reports[0])
    print(rs.comment_bank)