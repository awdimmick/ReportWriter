import datetime

import openpyxl, string, secrets, random, os, shutil

def allowed_file(filename):

    split = filename.rsplit('.',1)

    return split[1].lower() == "xlsx"


def validate_reoprt_set_file(file_path):
    try:
        xl_template = openpyxl.load_workbook(file_path, True)
        template_version = xl_template["Info"]["B4"].value

        if template_version not in [0.1]:
            return False

        return True

    except Exception:
        return False

def generate_secret_key():
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(16))

def generate_random_filename(folder, extension=""):

    random_filename = ''.join((secrets.choice(string.ascii_letters) for i in range(16))) + \
                      extension

    random_path = os.path.join('temp', random_filename)

    while os.path.exists(random_path):
         random_filename = ''.join((secrets.choice(string.ascii_letters) for i in range(16))) + \
                           "" if extension == "" else "." + extension

         random_path = os.path.join('temp', random_filename)

    return random_filename

def clear_temp_folder():
    try:
        shutil.rmtree('temp')
        shutil.rmtree('uploads')
    except:
        pass
    try:
        os.makedirs('temp')
        os.makedirs('uploads')
    except:
        pass


def log(message, ip=""):
    with open("log.csv","a") as logfile:
            logfile.write(f"{datetime.datetime.isoformat(datetime.datetime.now())},{message}, {ip}\n")



if __name__=="__main__":
    clear_temp_folder()
