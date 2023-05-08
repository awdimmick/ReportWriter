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
            add_temp_file_to_flush_queue(filepath)
            return send_from_directory(
                'temp',
                filename,
                download_name=download_filename,
                as_attachment=True
            )
        else:
            return abort(404)


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


@app.route('/upload_aeas', methods=['POST'])
def upload_aeas():
    if 'aeas_file' not in request.files:
        flash('No AEAS document uploaded!')
        return redirect(url_for('index'))

    aeas_file = request.files['aeas_file']

    if aeas_file.filename == '':
        flash('No selected file')
        return redirect(url_for('index'))

    if aeas_file and aeas_file.filename.rsplit('.', 1)[1] == "xlsm":
        # Should be a .xlsm file
        try:
            aeas_fn = secure_filename(aeas_file.filename).split(".xlsm", 1)[0] + datetime.datetime.strftime(datetime.datetime.now(),"%Y-%m-%d_%H%M%S" + ".xlsm")
            aeas_path = os.path.join('uploads', aeas_fn)
            aeas_file.save(aeas_path)
            add_temp_file_to_flush_queue(aeas_path)

            rs = model.AEASReportSetConverter.getReportSetFromAEAS(aeas_path)

            rs_filepath = rs.save_to_excel_template()
            #return "/download/" + rs_filepath
            return redirect('/download/' + rs_filepath)

        except model.AEASReportSetConverter.LoadAEASError as e:
            flash(str(e))
            return redirect(url_for('index'))

        except Exception as e:
            flash(str(e))
            return redirect((url_for('index')))


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
        add_temp_file_to_flush_queue(file_path)
        if utils.validate_reoprt_set_file(file_path):
            try:
                report_set = model.ReportSet.load_from_excel_template(file_path)
                # Rather than storing all the data in the session dictionary,
                # add to session a pointer to the JSON file and serve this
                # upon request.
                # session['active_report_set_json'] = report_set.report_set_as_json()
                json_filename = filename[:-4] + "json"
                json_file_path = os.path.join('temp', json_filename)
                with open (json_file_path, "w") as jsf:
                    jsf.write(report_set.report_set_as_json())
                session['active_report_set_json_file'] = json_filename
                # os.remove(file_path)
                return redirect(url_for('editor'))

            except model.LoadExcelTemplateException as e:
                flash("Error uploading Excel report set: " + str(e))
                return redirect(url_for('index'))

    flash("Invalid template file! Please download a fresh template and try again.")
    return redirect(url_for('index'))


@app.route('/editor')
def editor():
    return render_template('layout.html')


@app.route('/get_report_set', methods=['GET'])
def get_report_set_json_from_session():

    if 'active_report_set_json_file' in session:
        add_temp_file_to_flush_queue(os.path.join('temp', session['active_report_set_json_file']))
        return send_from_directory('temp', session['active_report_set_json_file'])

    # if 'active_report_set_json' in session:
    #    return session['active_report_set_json']
    else:
        return abort(404)


@app.after_request
def flush_temp_files(request):
    if 'temp_files_queue' in session:
        for fp in session['temp_files_queue']:
            try:
                session['temp_files_queue'].remove(fp)
                os.remove(fp)
                print("Deleted file: " + str(fp))
            except FileNotFoundError as e:
                print("ERROR: Could not find " + str(fp))
    return request


def add_temp_file_to_flush_queue(fp):
    if 'temp_files_queue' not in session:
        session['temp_files_queue'] = []
    session['temp_files_queue'].append(fp)
    print("temp files queue: " + str(session['temp_files_queue']))


if __name__ == '__main__':
    utils.clear_temp_folder()
    app.run()
