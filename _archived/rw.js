let active_report_set;
let active_report_index = 0;
let unsaved_changes = false;

function clear_local_storage() {
    window.localStorage.removeItem('active_report_set');
    window.localStorage.removeItem('unsaved_changes');
}

function new_menu_option(){
    if (unsaved_changes){
        if (window.confirm("You have unsaved changes! Are you sure you wish to start a new Report Set? This will discard your unsaved changes."))
        {
            window.location.href = "/";
        }
    }
    else{
            window.location.href = "/";
    }
}

function update_local_storage() {
    window.localStorage.setItem(
        'active_report_set',
        JSON.stringify(active_report_set)
    );
    window.localStorage.setItem(
        'unsaved_changes', unsaved_changes
    );
}

function get_active_report_set_from_storage() {
    if (window.localStorage.getItem('active_report_set') != null) {
        return JSON.parse(window.localStorage.getItem('active_report_set'));
    } else {
        return null;
    }
}

function editor_page_load() {
    const form = document.getElementById("import_comment_bank_form");
    // Add 'submit' event handler
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        import_comment_bank();
    });

    active_report_set = get_active_report_set_from_storage();
    if (active_report_set == null) {
        load_reports();
    } else {
        continue_editor_page_load();
    }
}

function continue_editor_page_load() {
    populate_reports();
    load_comment_bank();
}

function set_unsaved_changes(status) {
    window.localStorage.setItem('unsaved_changes', status);
    unsaved_changes = status
}

function render_reports() {
    for (var i = 0; i < active_report_set.reports.length; i++) {
        reports.innerHTML += active_report_set.reports[i].student.firstname + "<br>";
    }
}

function populate_reports() {
    //document.getElementById('report_selector').innerHTML = "<option value='0'>Select a report</option>";
    document.getElementById('report_selector').innerHTML = "";
    for (var i = 0; i < active_report_set.reports.length; i++) {
        let active_report = active_report_set.reports[i];
        document.getElementById('report_selector').innerHTML += `<option value="${active_report.id}">${active_report.student.firstname} ${active_report.student.lastname}</option>`;
    }
    load_report_for_editing();
}

function load_comment_bank() {
    let comment_bank = active_report_set.comment_bank;
    document.getElementById("comment_bank_area").innerHTML =
        `<h3>Comment bank</h3>
        <button onclick="add_comment_item()" class="btn btn-outline-primary btn-sm">Add comment</button><br>`;
    let comment_count = 0;
    for (const [label, value] of Object.entries(comment_bank)) {
        comment_count++;
        document.getElementById("comment_bank_area").innerHTML +=
            `<div id="comment_bank_item_${comment_count}" class="comment_bank_item"><label for="comment_bank_label_${comment_count}" class="form-label">Label:</label><br><input type="text" id="comment_bank_label_${comment_count}" name="comment_bank_label_${comment_count}" class="comment_bank_label form-control-sm" value="${label}" onfocusout="update_comment_bank()" /><br>
               <label for="comment_bank_value_${comment_count}" class="form-label">Comment:</label><br><textarea id="comment_bank_value_${comment_count}" name="comment_bank_value_${comment_count}" class="comment_bank_comment form-control-sm" onfocusout="update_comment_bank()">${value}</textarea>
               <br><button onclick="remove_comment(${comment_count})" class="btn btn-outline-danger btn-sm">Detele comment</button></div>`;
    }
}

function add_comment_item() {
    let id = document.getElementsByClassName("comment_bank_item").length + 1;
    let comment_bank_area = document.getElementById("comment_bank_area");
    let new_comment_item = document.createElement("div");

    new_comment_item.id = `comment_bank_item_${id}`;
    new_comment_item.className = "comment_bank_item";
    new_comment_item.innerHTML =
        `<label for="comment_bank_label_${id}" class="form-label">Label:</label><br><input type="text" id="comment_bank_label_${id}" name="comment_bank_label_${id}" class="comment_bank_label form-control" placeholder="Enter label" onfocusout="update_comment_bank()" /><br>
          <label for="comment_bank_value_${id}" class="form-label">Comment:</label><br><textarea id="comment_bank_value_${id}" name="comment_bank_value_${id}" class="comment_bank_comment form-control" onfocusout="update_comment_bank()" placeholder="Enter comment"></textarea>
           <br><button onclick="remove_comment(${id})">Detele comment</button>`;

    // Place after the h2 and the add button
    comment_bank_area.children[1].after(new_comment_item);
}

function load_report_for_editing() {
    active_report_index = document.getElementById('report_selector').value;
    let report = active_report_set.reports[active_report_index - 1];
    if (active_report_index != 0) {
        document.getElementById("student_notes").innerHTML = `<h3>${report.student.firstname} ${report.student.lastname}` +  (report.group != null ? `(${report.student.group})` : '') + `</h3><p class="student_notes">${report.student.notes != null?report.student.notes : ''}</p>`
        document.getElementById("raw_comment_editor").value = report.raw_comment;
        document.getElementById("compiled_comment_preview").innerText = report.compiled_comment;
        // Load data values
        document.getElementById("data_values_area").innerHTML = "<h4>Data values</h4>";
        for (const [label, value] of Object.entries(report.data_values)) {
            document.getElementById("data_values_area").innerHTML +=
                `<p><span class="data_label">${label}</span>: <span class="data_value">${value}</span></p>`;
        }
        compile_report();
    }
}

function load_reports_from_server() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/get_report_set");
    xhr.onload = () => {
        if (xhr.status == 200) {
            active_report_set = JSON.parse(xhr.responseText);
            update_local_storage();
            continue_editor_page_load();
        } else if (xhr.status == 404) {
            console.log("No active report set found.");
            window.location.href = "/";
        }
    };
    xhr.send();
}

function export_report_set(format) {
    if (format === "pdf" || format === "docx" || format === "txt") {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "/download/" + format);
        xhr.responseType = "text";

        xhr.onload = (event) => {
            if (xhr.status === 200) {
                window.location.href = xhr.responseText;
            }
        }
        xhr.send(JSON.stringify(active_report_set));
    }
}

function import_comment_bank() {
    const XHR = new XMLHttpRequest();

    // Bind the FormData object and the form element
    let form = document.getElementById("import_comment_bank_form");
    const FD = new FormData(form);

    // Define what happens on successful data submission
    XHR.addEventListener("load", (event) => {

        if (XHR.status === 200) {
            let cb = JSON.parse(XHR.responseText);
            if (Object.entries(cb).length === 0) {
                window.alert("No comments found in the uploaded template!");
            } else if (window.confirm(`${Object.entries(cb).length} comments found. Are you sure you wish to import these into the comment bank? Comments with the same label as those being imported will be replaced.`)) {
                for ([label, value] of Object.entries(cb)) {
                    active_report_set.comment_bank[label] = value;
                }
                load_comment_bank();
                compile_report(); // Show update on currently-loaded report
                compile_all_reports(); // Apply update to all reports
                update_local_storage(); // Update local storage copy of active_report_set
                alert_unsaved_changes(true);

            }
            document.getElementById("report_set_file").value = "";
        }

    });

    // Define what happens in case of error
    XHR.addEventListener("error", (event) => {
        alert('There was an error importing comments. Please check that you are using a correctly formatted ReportWriter template.');
    });

    // Set up our request
    XHR.open("POST", "/upload_comment_bank");

    // The data sent is what the user provided in the form
    XHR.send(FD);

}

function download_updated_template() {

    /**
     * Sends the active_report_set in JSON form to the API at /download/xlsx
     * and kicks off the download of the file.
     */

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/download/xlsx");
    xhr.responseType = "text";

    xhr.onloadstart = () => {

        let save_button = document.getElementById("btn_download_xlsx");
        save_button.setAttribute("disabled", "true");
        save_button.innerText = "Saving...";
    }

    xhr.onload = (event) => {
        if (xhr.status == 200) {
            let save_button = document.getElementById("btn_download_xlsx");
            save_button.removeAttribute("disabled");
            save_button.innerText = "Save reports";
            alert_unsaved_changes(false);
            let download_url = xhr.responseText;
            window.location.href = download_url;
        }
    }
    xhr.send(JSON.stringify(active_report_set));

}

function compile_report() {

    /*
    As each character is typed in the raw comment textarea, iterate through all comments and then data values,
    replacing their respective labels within the preview.

    Once focus is lost, update the compiled comment and raw comment entiries in the active report.
     */

    if (active_report_index != 0) {
        let active_report = active_report_set.reports[active_report_index - 1];
        let raw_editor = document.getElementById("raw_comment_editor");
        let compiled_preview = document.getElementById("compiled_comment_preview");
        let compiled_report_length = document.getElementById("compiled_report_length");
        let compiled_comment = raw_editor.value;

        // Replace comments
        for (const [label, value] of Object.entries(active_report_set.comment_bank)) {
            compiled_comment = compiled_comment.replaceAll(`[${label}]`, value);
        }

        // Replace data values
        for (const [label, value] of Object.entries(active_report.data_values)) {
            compiled_comment = compiled_comment.replaceAll(`[${label}]`, value);
        }

        // Replace name
        compiled_comment = compiled_comment.replaceAll("[name]", active_report.student.firstname);

        // Show new comment and length
        compiled_preview.innerText = compiled_comment;
        compiled_report_length.innerText = `${compiled_comment.length} character` + (compiled_comment.length != 1 ? 's' : '');
    }
}

function compile_all_reports() {
    /*
    After updating the comment bank, re-compile all reports in the active report set
    to use the new comments.
     */

    let compiled_comment = "";

    for (let report of active_report_set.reports) {

        compiled_comment = report.raw_comment;

        // Replace comments
        for (const [label, value] of Object.entries(active_report_set.comment_bank)) {
            compiled_comment = compiled_comment.replaceAll(`[${label}]`, value);
        }

        // Replace data values
        for (const [label, value] of Object.entries(report.data_values)) {
            compiled_comment = compiled_comment.replaceAll(`[${label}]`, value);
        }

        // Replace name
        compiled_comment = compiled_comment.replaceAll("[name]", report.student.firstname);

        report.compiled_comment = compiled_comment;

    }

    update_local_storage();
}

function update_comment_bank() {

    let comment_bank_labels = document.getElementsByClassName("comment_bank_label");
    let comment_count = comment_bank_labels.length;

    active_report_set.comment_bank = {};

    for (let i = 1; i <= comment_count; i++) {
        let label = document.getElementById(`comment_bank_label_${i}`).value;
        let comment = document.getElementById(`comment_bank_value_${i}`).value;
        active_report_set.comment_bank[label] = comment;
    }
    compile_report(); // Show update on currently-loaded report
    compile_all_reports(); // Apply update to all reports
    update_local_storage(); // Update local storage copy of active_report_set
    alert_unsaved_changes(true);
}

function update_active_report_set() {

    if (active_report_index != 0) {
        let active_report = active_report_set.reports[active_report_index - 1];
        let raw_editor = document.getElementById("raw_comment_editor");
        let compiled_preview = document.getElementById("compiled_comment_preview");

        active_report.raw_comment = raw_editor.value;
        active_report.compiled_comment = compiled_preview.innerText;

        update_local_storage();
        set_unsaved_changes(true);
        alert_unsaved_changes(true);
    }

}

function alert_unsaved_changes(show_message) {
    let notifications_area = document.getElementById("notification_area");

    if (show_message) {
        notifications_area.innerText = "You have unsaved changes"

    } else {
        notifications_area.innerHTML = "";

    }
}

function remove_comment(comment_id) {
    if (window.confirm("Are you sure you wish to delete this comment from the comment bank? It will be removed for all reports in this report set.")) {
        document.getElementById(`comment_bank_item_${comment_id}`).remove();
        renumber_comment_bank_items();
        update_comment_bank();
    }
}

function renumber_comment_bank_items() {
    let comment_items = document.getElementsByClassName("comment_bank_item");
    let count = 0;

    for (let item of comment_items) {
        count++;
        for (let child of item.children) {
            if (child.tagName == "LABEL") {
                if (child.getAttribute('for').includes("comment_bank_label_")) {
                    child.setAttribute('for', `comment_bank_label_${count}`);
                } else if (child.getAttribute('for').includes("comment_bank_value_")) {
                    child.setAttribute('for', `comment_bank_value_${count}`);
                }
            } else if (child.id.includes("comment_bank_label_")) {
                child.id = `comment_bank_label_${count}`;
            } else if (child.id.includes("comment_bank_value_")) {
                child.id = `comment_bank_value_${count}`;
            }
        }
        item.id = `comment_bank_item_${count}`;
    }
}