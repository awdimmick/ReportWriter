import json

from flask import Flask, render_template, send_from_directory, redirect, url_for, request, flash, abort, session
from werkzeug.utils import secure_filename
import os
import datetime

import model
import utils
from utils import allowed_file, generate_secret_key, generate_random_filename, clear_temp_folder


utils.clear_temp_folder()
app = Flask(__name__)
app.config['SECRET_KEY'] = generate_secret_key()

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/get_template')
def send_template():
    return send_from_directory('resources','template.xlsx', download_name='ReportWriterTemplate.xlsx', as_attachment=True)


@app.route('/download/xlsx', methods=["POST"])
def download_xlsx():
    try:

        data = request.data
        rs_data = data.decode('utf-8')
        rs = model.ReportSet.load_from_json(rs_data)

        saved_filename = rs.save_to_excel_template(os.path.join('temp', utils.generate_random_filename('temp', '.xlsx')))

        return "/download/" + saved_filename

    except model.SaveExcelTemplateException as e:
        flash(e)


@app.route('/download/<format>', methods=["POST"])
def download(format):
    try:
        if format not in ['pdf', 'docx', 'txt']:
            raise model.ExportReportSetException("Invalid format specified!")

        data = request.data
        rs_data = data.decode('utf-8')
        rs = model.ReportSet.load_from_json(rs_data)

        if format == "pdf":
            saved_filename = rs.export_to_pdf(os.path.join('temp', utils.generate_random_filename('temp', '.pdf')))
        elif format == "docx":
            saved_filename = rs.export_to_word(os.path.join('temp', utils.generate_random_filename('temp', '.docx')))
        elif format == "txt":
            saved_filename = rs.export_to_txt(os.path.join('temp', utils.generate_random_filename('temp', '.txt')))

        return "/download/" + saved_filename

    except model.ExportReportSetException as e:
        flash(e)


@app.route('/download/temp/<filename>', methods=["GET", "DELETE"])
def download_temp_file(filename):

    if request.method == "GET":

        filepath = os.path.join('temp', filename)
        extension = filename.rsplit('.',1)[1]

        if os.path.exists(filepath):
            download_filename = "ReportWriterExport_" + datetime.datetime.strftime(datetime.datetime.now(), "%Y-%m-%d_%H%M%S") + f".{extension}"

            return send_from_directory(
                'temp',
                filename,
                download_name=download_filename,
                as_attachment=True
            )
        else:
            return abort(404)

    elif request.method == "DELETE":
        filepath = os.path.join('temp', filename)
        if os.path.exists(filepath):
            return 200
        else:
            return 404

@app.route('/upload_comment_bank', methods=["POST"])
def upload_comment_bank():
    if 'report_set_file' not in request.files:
        flash('No file uploaded!')
        return redirect(url_for('index'))

    file = request.files['report_set_file']

    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == '':
        flash('No selected file')
        return redirect(url_for('editor'))

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename).split(".xlsx",1)[0] + datetime.datetime.strftime(datetime.datetime.now(),"%Y-%m-%d_%H%M%S" + ".xlsx")
        file.save(os.path.join("uploads", filename))
        file_path = os.path.join('uploads', filename)
        if utils.validate_reoprt_set_file(file_path):
            try:
                report_set = model.ReportSet.load_from_excel_template(file_path)
                comment_bank = report_set.comment_bank_as_json()
                os.remove(file_path)
                return comment_bank, 200
            except model.LoadExcelTemplateException as e:
                flash(e)
                return abort(400)
    return abort(400)

@app.route('/upload_report_set', methods=["POST"])
def upload_report_set():
    if 'report_set_file' not in request.files:
        flash('No file uploaded!')
        return redirect(url_for('index'))

    file = request.files['report_set_file']

    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == '':
        flash('No selected file')
        return redirect(url_for('index'))

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename).split(".xlsx",1)[0] + datetime.datetime.strftime(datetime.datetime.now(),"%Y-%m-%d_%H%M%S" + ".xlsx")
        file.save(os.path.join("uploads", filename))
        file_path = os.path.join('uploads', filename)
        if utils.validate_reoprt_set_file(file_path):
            try:
                report_set = model.ReportSet.load_from_excel_template(file_path)
                session['active_report_set_json'] = report_set.report_set_as_json()
                os.remove(file_path)
                return redirect(url_for('editor'))
            except model.LoadExcelTemplateException as e:
                flash("Invalid template file! Please download a fresh template and try again.")
                return redirect(url_for('index'))
    flash("Invalid template file! Please download a fresh template and try again.")
    return redirect(url_for('index'))

@app.route('/editor')
def editor():
    return render_template('layout.html')

@app.route('/get_report_set', methods=['GET'])
def get_report_set_json_from_session():
    if 'active_report_set_json' in session:
        return session['active_report_set_json']
    else:
        return abort(404)

if __name__ == '__main__':
    utils.clear_temp_folder()
    app.run()
