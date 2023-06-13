/** Report data model **/
let active_report_set;
let active_report_id = 1
let unsaved_changes = false;
let comment_bank = {'No category': []};

// active_report_set = JSON.parse(`
// {
//        "reports": [
//           {
//              "id": 1,
//              "raw_comment": "Adam's report is basically good. [ENG] [EOY]",
//              "compiled_comment": "Adam's report is basically good. Adam engages well in lessons. Adam's mock result was 99%, compared to 88% for his end-of-year exam in Year 10.",
//              "student": {
//                 "firstname": "Adam",
//                 "lastname": "Dimmick",
//                 "group": "12B",
//                 "notes": "Tilt"
//              },
//              "data_values": {
//                 "Y10 av": 89,
//                 "Y10 EOY": 88,
//                 "Y11 av": 97,
//                 "Y11 mock": 99
//              }
//           },
//           {
//              "id": 2,
//              "raw_comment": "Louise's report",
//              "compiled_comment": "Louise's compiled report",
//              "student": {
//                 "firstname": "Louise",
//                 "lastname": "Dimmick",
//                 "group": "12B",
//                 "notes": "SEN"
//              },
//              "data_values": {
//                 "Y10 av": 87,
//                 "Y10 EOY": 68,
//                 "Y11 av": 77,
//                 "Y11 mock": 78
//              }
//           },
//           {
//              "id": 3,
//              "raw_comment": "Jane's report",
//              "compiled_comment": "Jane's compiled report",
//              "student": {
//                 "firstname": "Bob",
//                 "lastname": "Jane",
//                 "group": "12B",
//                 "notes": null
//              },
//              "data_values": {
//                 "Y10 av": 69,
//                 "Y10 EOY": 72,
//                 "Y11 av": 75,
//                 "Y11 mock": 79
//              }
//           }
//        ],
//        "comment_bank": [
//           {
//              "id": 1,
//              "label": "ENG",
//              "text": "[name] engages well in lessons.",
//              "category": "Engagement"
//           },
//           {
//              "id": 2,
//              "label": "EXC",
//              "text": "[name] produces excellent work.",
//              "category": "Work"
//           },
//           {
//              "id": 3,
//              "label": "EOY",
//              "text": "[name]'s mock result was [Y11 mock]%, compared to [Y10 EOY]% for his end-of-year exam in Year 10.",
//              "category": "Exams"
//           },
//           {
//              "id": 4,
//              "label": "TOTALLY NEW",
//              "text": "A new comment to add",
//              "category": "Engagement"
//           }
//        ]
//     }`)


/** Local storage management for persistence between sessions **/
function clear_local_storage() {
    window.localStorage.removeItem('active_report_set');
    window.localStorage.removeItem('unsaved_changes');
    window.localStorage.removeItem('comment_bank');
}

function update_local_storage() {
    window.localStorage.setItem(
        'active_report_set',
        JSON.stringify(active_report_set)
    );
    window.localStorage.setItem(
        'unsaved_changes', unsaved_changes
    );
    window.localStorage.setItem(
        'comment_bank', JSON.stringify(comment_bank)
    );
}

function load_local_storage() {
    active_report_set = null;
    unsaved_changes = false;

    if (window.localStorage.getItem('active_report_set') != null) {
        active_report_set = JSON.parse(window.localStorage.getItem('active_report_set'));
    }
    if (window.localStorage.getItem('unsaved_changes') != null) {
        unsaved_changes = window.localStorage.getItem('unsaved_changes');
    }
    if (window.localStorage.getItem('comment_bank') != null) {
        comment_bank = window.localStorage.getItem('comment_bank');
    }
}

function get_active_report_set_from_local_storage() {
    if (window.localStorage.getItem('active_report_set') != null) {
        return JSON.parse(window.localStorage.getItem('active_report_set'));
    } else {
        return null;
    }
}

function load_reports_from_server() {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/get_report_set");
    xhr.onload = () => {
        if (xhr.status == 200) {
            active_report_set = JSON.parse(xhr.responseText);
            // In case any reports comments are null, replace with empty strings

            for (const report of active_report_set.reports) {
                if (report.raw_comment == null) {
                    report.raw_comment = "";
                }
                if (report.compiled_comment == null) {
                    report.compiled_comment = "";
                }
            }

            update_local_storage();
            continue_loading_editor_page();
        } else if (xhr.status == 404) {
            alert("No reports could be found in the uploaded document");

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

function save_excel() {

    /**
     * Sends the active_report_set in JSON form to the API at /download/xlsx
     * and kicks off the download of the file.
     */

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/download/xlsx");
    xhr.responseType = "text";

    xhr.onloadstart = () => {

        // let save_button = document.getElementById("btn_download_xlsx");
        // save_button.setAttribute("disabled", "true");
        // save_button.innerText = "Saving...";

        show_hide_download_progress_modal("show");

    }

    xhr.onload = (event) => {
        if (xhr.status == 200) {
            // let save_button = document.getElementById("btn_download_xlsx");
            // save_button.removeAttribute("disabled");
            // save_button.innerText = "Save reports";
            show_hide_download_progress_modal("hide");
            alert_unsaved_changes(false);
            let download_url = xhr.responseText;
            window.location.href = download_url;
        }
    }
    xhr.send(JSON.stringify(active_report_set));

}

function new_report_set() {
    if (!unsaved_changes) {
        window.location.href = '/';
    } else if (window.confirm("Are you sure you wish to start a new report set? You will lose any unsaved changes to your current reports.")) {
        window.location.href = '/';
    }
}

function alert_unsaved_changes(show_message) {
    let notifications_area = document.getElementById("notification_area");

    if (show_message) {
        notifications_area.innerText = "You have unsaved changes"
        unsaved_changes = true;

    } else {
        notifications_area.innerHTML = "";
        unsaved_changes = false;

    }
}

/** Comment bank functions **/
function load_comment_bank() {
    /**
     * Updates the local 'comments' dictionary with all comments, organised by category
     */

    // Clear existing comment bank
    comment_bank = {'No category': []};

    const cb = active_report_set.comment_bank;

    for (const comment of cb) {

        if (comment.category == null) {
            comment_bank['No category'].push(comment);
        } else {
            // Check if comment category already exists as a key in the
            // comment_bank dictionary. If so, append comment to the list
            // associated with that key, else add a new key and list
            // containing that comment
            if (comment.category in comment_bank) {
                comment_bank[comment.category].push(comment);
            } else {
                comment_bank[comment.category] = [comment];
            }
        }
    }

}


/** Render comment bank **/
function tests() {
    let comment_id = 0;

    /**
     for (let i = 1; i <= 3; i++) {
        add_comment_category_to_comment_bank(`Category ${i}`);
        for (let j = 1; j <= 4; j++) {
            comment_id++;
            render_comment_bank_comment("Comment" + comment_id, "Comment text", comment_id, `Category ${i}`);
        }
    }
     **/
    for (let i = 1; i <= 5; i++) {
        add_student_to_sidebar("Student with a long name " + i, i);
    }

    load_comment_bank();
    refresh_comment_bank();

    populate_student_sidebar();

    // set_student_sidebar_status("complete", 1);
    // set_student_sidebar_status("complete", 2);

    load_active_report(1);

}


function load_editor_page() {

    //active_report_set = get_active_report_set_from_local_storage();

    load_local_storage();

    if (active_report_set == null) {
        load_reports_from_server();
    } else {
        continue_loading_editor_page();
    }
}

function continue_loading_editor_page() {
    load_comment_bank();
    refresh_comment_bank();
    populate_student_sidebar();
    load_active_report(1);
    alert_unsaved_changes(false);
}

function refresh_comment_bank() {
    /**
     *  Using the global comment bank, display each comment bank category and add comments
     **/

    // Clear all existing content of the comment bank sidebar first
    document.getElementById("comment_bank_comments").innerHTML = "";

    for (const category of Object.keys(comment_bank).sort()) {
        if (comment_bank[category].length > 0) {
            add_comment_category_to_comment_bank(category);
            for (const comment of comment_bank[category]) {
                render_comment_bank_comment(comment.label, comment.text, comment.id, category);
            }
        }
    }
}

function render_comment_bank_comment(label, text, id, category) {

    let comment_parent = document.getElementById("comment_bank_comments");

    if (category != null) {
        // Find the category button where the comment should be appended
        comment_parent = document.getElementById(`cb_${category}_comments`);
    }

    // Create div element to contain the commment
    const comment = document.createElement("div");
    comment.id = "cb_comment_" + id;
    comment.className = "w3-panel w3-border w3-white";
    // comment.onmouseenter = function () {
    //     showHideCommentBankButtons(id, true)
    // };
    // comment.onmouseleave = function () {
    //     showHideCommentBankButtons(id, false)
    // };
    comment.innerHTML = `<p><strong>${label}</strong></p>`;
    comment.innerHTML += `<p>${text}</p>`;

    // Create div element to contain the comment action buttons
    const comment_action_buttons = document.createElement("div");
    comment_action_buttons.id = "cb_comment_" + id + "_buttons";
    comment_action_buttons.className = "w3-center w3-margin-bottom w3-hide";
    comment_action_buttons.innerHTML = `<div class="w3-bar">
                                <button class="w3-small w3-button w3-white w3-border w3-round w3-hover-green" onclick="use_comment_in_report(${id})">Use
                                </button>&nbsp;
                                <button class="w3-small w3-button w3-white w3-border w3-round" onclick="showHideAddCommentModal('show',${id})">Edit</button>&nbsp;
                                <button class="w3-small w3-button w3-white w3-border w3-round w3-hover-red" onclick="delete_comment_from_comment_bank(${id})">Delete
                                </button>
                            </div>`;

    comment.appendChild(comment_action_buttons);
    comment_parent.appendChild(comment);
    showHideCommentBankButtons(id, true);

}

function add_comment_category_to_comment_bank(label) {

    const comment_bank = document.getElementById("comment_bank_comments");

    const category_button = document.createElement("button");
    category_button.className = "w3-button w3-block w3-border-top w3-border-bottom";
    category_button.innerText = label.toUpperCase();
    category_button.onclick = function () {
        showCommentBankCategory(label)
    };

    const comment_holder = document.createElement("div");
    comment_holder.id = `cb_${label}_comments`;
    comment_holder.className = "w3-hide rw-cb-category w3-show";

    comment_bank.appendChild(category_button);
    comment_bank.appendChild(comment_holder);

}

/** Comment bank interaction **/

function showCommentBankCategory(categoryLabel) {

    let x = document.getElementById(`cb_${categoryLabel}_comments`);
    if (x.className.indexOf("w3-show") != -1) {
        x.className = x.className.replace(" w3-show", "");

    } else {
        x.className += " w3-show";
    }

}

function showHideCommentBankButtons(commentNumber, show) {

    let x = document.getElementById(`cb_comment_${commentNumber}_buttons`);
    if (x != null) {
        if (show) {
            x.className += " w3-show";
        } else {
            x.className = x.className.replace(" w3-show", "");
        }

    }
}

function use_comment_in_report(comment_id) {
    const report_text = document.getElementById("raw_report_text");
    report_text.value += `[${active_report_set.comment_bank[comment_id - 1].label}]`;
    report_text.focus();
    compile_report_preview();
}

function delete_comment_from_comment_bank(comment_id) {
    if (window.confirm("Are you sure that you wish to delete this comment from the comment bank? This will affect all reports in the current report set.")) {
        active_report_set.comment_bank.splice(comment_id - 1, 1);
        load_comment_bank();
        refresh_comment_bank();
        compile_report_preview();
        compile_all_reports();
        update_local_storage();
    }

}

/** Add comment bank modal **/
function showHideAddCommentModal(show, comment_id) {

    // Clear all data
    const label = document.getElementById("add_comment_modal_label");
    const text = document.getElementById("add_comment_modal_text");
    const category = document.getElementById("add_comment_modal_category");
    const save_btn = document.getElementById("add_comment_modal_add_button");
    let id = comment_id;

    if (comment_id == null) {
        label.value = "";
        text.value = "";
        category.value = "";
        save_btn.onclick = function () {
            add_comment_to_comment_bank()
        };
        save_btn.innerText = "Add to comment bank";

    } else {
        label.value = active_report_set.comment_bank[id - 1].label;
        text.value = active_report_set.comment_bank[id - 1].text;
        category.value = active_report_set.comment_bank[id - 1].category;
        save_btn.onclick = function () {
            add_comment_to_comment_bank(id)
        };
        save_btn.innerText = "Save changes";
    }

    // Add comment bank categories to the categories list
    const categories = document.getElementById("add_comment_modal_categories");
    categories.innerHTML = "";

    for (let c of Object.keys(comment_bank)) {
        let opt = document.createElement("option");
        opt.innerText = c;
        categories.appendChild(opt);
    }

    // Add report set's data labels as buttons
    const data_value_labels = Object.keys(active_report_set.reports[0].data_values);
    const btns = document.getElementById("add_comment_modal_data_value_buttons");
    btns.innerHTML = `<button class="w3-button w3-border w3-padding-small w3-margin-bottom" onclick="addDataLabelToComment('name')">
                            name
                        </button>&nbsp;
                        <button class="w3-button w3-border w3-padding-small w3-margin-bottom" onclick="addDataLabelToComment('hht')">
                            his/her/their
                        </button>&nbsp;
                        <button class="w3-button w3-border w3-padding-small w3-margin-bottom" onclick="addDataLabelToComment('hst')">
                            he/she/they
                        </button>&nbsp;`;
    for (let l of data_value_labels) {
        let btn = document.createElement('button');
        btn.className = "w3-button w3-border w3-padding-small w3-margin-right w3-margin-bottom";
        btn.onclick = function () {
            addDataLabelToComment(`${l}`)
        };
        btn.innerText = l;
        btns.appendChild(btn);
    }

    if (comment_id != null) {
        document.getElementById("add_comment_modal_title").innerText = "Edit comment";
    } else {
        document.getElementById("add_comment_modal_title").innerText = "Add comment";
    }
    document.getElementById('add_comment_modal').style.display = show === "show" ? 'block' : 'none';
}

function addDataLabelToComment(label) {
    document.getElementById("add_comment_modal_text").value += `[${label}]`;
    document.getElementById("add_comment_modal_text").focus();
}

function add_comment_to_comment_bank(edit_id) {

    const label = document.getElementById("add_comment_modal_label");
    const text = document.getElementById("add_comment_modal_text");
    const category = document.getElementById("add_comment_modal_category");
    if (edit_id) {
        active_report_set.comment_bank[edit_id - 1] = {
            'id': edit_id,
            'label': label.value,
            'text': text.value,
            'category': category.value
        }

    } else {
        // Add new comment to active report set's comment bank
        const id = active_report_set.comment_bank.length + 1;
        active_report_set.comment_bank.push({
            'id': id,
            'label': label.value,
            'text': text.value,
            'category': category.value
        });
    }

    // Reload comment bank, including categories
    load_comment_bank();

    // Redraw comment bank sidebar
    refresh_comment_bank();

    // Process all reports to use new comment
    compile_all_reports();
    load_active_report(active_report_id);
    //compile_report_preview();

    // Update local storage
    update_local_storage();

    // Close modal
    showHideAddCommentModal("hide", null);

}

/** Add student selection in sidebar **/
function populate_student_sidebar() {
    const sidebar = document.getElementById("student_sidebar");
    sidebar.innerHTML = "";

    for (const report of active_report_set.reports) {
        add_student_to_sidebar(
            `${report.student.firstname} ${report.student.lastname}`,
            report.id
        );
    }

}

function add_student_to_sidebar(display_name, report_id) {
    const sidebar = document.getElementById("student_sidebar");
    const item = document.createElement("button");
    item.className = "rw-student-sidebar-item w3-bar-item w3-button";
    item.id = "student_sidebar_button_" + report_id;
    item.value = display_name;
    item.innerText = display_name;
    item.onclick = function () {
        load_active_report(report_id)
    };
    sidebar.appendChild(item);
    // Add complete/incomplete indicator
    let report_complete = active_report_set.reports[report_id - 1].complete ? "complete" : "draft";
    set_student_sidebar_status(report_complete, report_id);
}

function set_student_sidebar_status(status, report_id) {
    const sidebar_buttons = document.getElementsByClassName("rw-student-sidebar-item");
    for (const sidebarButton of sidebar_buttons) {
        if (sidebarButton.id === `student_sidebar_button_${report_id}`) {
            if (status === "complete") {
                sidebarButton.style += "margin-left:-5px; border-left-width:5px; border-left-color:green; border-left-style:solid; background-color:rgb(203, 223, 199) ";
            } else {
                //sidebarButton.style = sidebarButton.style.replace("margin-left:-5px; border-left-width:5px; border-left-color:green; border-left-style:solid; background-color:rgb(203, 223, 199) ", "");
                sidebarButton.style = "";
            }
        }
    }
}

/** Load reports **/
function load_active_report(report_id) {

    // Handle navigation button calls
    if (report_id === "next") {
        report_id = active_report_id + 1;
    } else if (report_id === "previous") {
        report_id = active_report_id - 1;
    }

    // Prevent going beyond bounds of reports
    if (report_id < 1) {
        report_id = 1;
    } else if (report_id > active_report_set.reports.length) {
        report_id = active_report_set.reports.length;
    }

    active_report_id = report_id;

    // Clear other selected buttons
    const sidebar_buttons = document.getElementsByClassName("rw-student-sidebar-item");
    for (const sidebarButton of sidebar_buttons) {
        sidebarButton.className = sidebarButton.className.replace(" w3-green", "");
    }

    const sidebar_button = document.getElementById(`student_sidebar_button_${report_id}`);
    sidebar_button.className += " w3-green";

    let active_report = active_report_set.reports[report_id - 1];

    // Load content into report editor

    const raw_report = document.getElementById("raw_report_text");
    const compiled_report = document.getElementById("report_editor_compiled_report");

    document.getElementById("report_editor_student_name").innerText = `${active_report.student.firstname} ${active_report.student.lastname}`;
    document.getElementById("report_editor_student_group").innerText = active_report.student.group;

    // Add student notes (remove if none)
    const student_notes_container = document.getElementById("report_editor_student_notes_container");

    if (active_report.student.notes != null) {
        document.getElementById("report_editor_student_notes_text").innerText = active_report.student.notes;
        student_notes_container.className = student_notes_container.className.replaceAll(" w3-hide", "");

    } else {
        student_notes_container.className += " w3-hide";
    }

    raw_report.value = active_report.raw_comment;
    //compiled_report.innerText = active_report.compiled_comment;
    compile_report_preview();
    load_active_report_data_values();
    // Update the "mark as complete" and sidebar completeness indicator
    set_active_report_complete_status(active_report.complete);

}

/** Report editor functions **/
function compile_report_preview() {

    const raw_report = document.getElementById("raw_report_text");
    const compiled_report = document.getElementById("report_editor_compiled_report");

    let compiled = raw_report.value;
    let active_report = active_report_set.reports[active_report_id - 1];

    // Go through each comment in comment bank and replace labels with comment text
    for (const c of active_report_set.comment_bank) {
        compiled = compiled.replaceAll(`[${c.label}]`, c.text);
    }

    // Go through each report data value and replace data value labels (dvl) with values
    for (const dvl of Object.keys(active_report.data_values)) {
        compiled = compiled.replaceAll(`[${dvl}]`, active_report.data_values[dvl]);
    }

    // Update gender-specific pronouns
    if (active_report.student.gender.toUpperCase()[0] === "M") {
        compiled = compiled.replaceAll("[hht]", "his");
        compiled = compiled.replaceAll("[hst]", "he");
    } else if (active_report.student.gender.toUpperCase()[0] === "F") {
        compiled = compiled.replaceAll("[hht]", "her");
        compiled = compiled.replaceAll("[hst]", "she");
    } else {
        compiled = compiled.replaceAll("[hht]", "their");
        compiled = compiled.replaceAll("[hst]", "they");
    }

    // Replace name
    compiled = compiled.replaceAll("[name]", active_report.student.firstname);

    // Update character count
    document.getElementById("report_editor_character_count").innerText = `${compiled.length} character${compiled.length !== 1 ? 's' : ''}`;

    // Show notification that there are unsaved changes
    alert_unsaved_changes(true);

    compiled_report.innerText = compiled;

}

function load_active_report_data_values() {
    let active_report = active_report_set.reports[active_report_id - 1];
    let dv_labels = Object.keys(active_report.data_values);

    const dv_table = document.getElementById("report_editor_data_values_table");
    dv_table.innerHTML = "";

    if (dv_labels.length > 0) {

        // Add header
        let row = document.createElement("tr");
        row.innerHTML = "<th>Perspective</th><th>Value</th>";
        dv_table.appendChild(row);

        // Add data value pairs
        for (let dvl of dv_labels) {
            row = document.createElement("tr");
            row.onclick = function () {
                add_data_label_to_report(`${dvl}`)
            };
            row.innerHTML = `<td>${dvl}</td><td>${active_report.data_values[dvl]}</td>`;
            dv_table.appendChild(row);
        }
    }
}

function add_data_label_to_report(label) {

    const raw_report = document.getElementById("raw_report_text");

    raw_report.value += `[${label}]`;
    raw_report.focus();

    compile_report_preview();

}

function update_active_report() {

    let active_report = active_report_set.reports[active_report_id - 1];

    const raw_report = document.getElementById("raw_report_text");
    const compiled_report = document.getElementById("report_editor_compiled_report");

    active_report.raw_comment = raw_report.value;
    active_report.compiled_comment = compiled_report.innerText;

    update_local_storage();

}

function set_active_report_complete_status(complete) {
    let active_report = active_report_set.reports[active_report_id - 1];
    let mark_complete_btn = document.getElementById("report_editor_complete_button");
    active_report.complete = complete;

    if (complete) {
        // Update "Mark as complete button"
        mark_complete_btn.innerText = "Mark as incomplete";
        mark_complete_btn.className = mark_complete_btn.className.replace(" w3-white", " w3-green");
        mark_complete_btn.className = mark_complete_btn.className.replace(" w3-hover-green", " w3-hover-gray");
        // Change button behaviour
        mark_complete_btn.onclick = function () {
            set_active_report_complete_status(false)
        };
        // Update sidebar appearance for active report
        set_student_sidebar_status("complete", active_report_id);
    } else {
        set_student_sidebar_status("draft", active_report_id);
        mark_complete_btn.innerText = "Mark as complete";
        mark_complete_btn.className = mark_complete_btn.className.replace(" w3-green", " w3-white");
        mark_complete_btn.className = mark_complete_btn.className.replace(" w3-hover-gray", " w3-hover-green");
        mark_complete_btn.onclick = function () {
            set_active_report_complete_status(true)
        };

    }

    alert_unsaved_changes(true);

}

function compile_all_reports() {

    // Iterate through all reports in the active report set
    for (const report of active_report_set.reports) {
        report.compiled_comment = report.raw_comment;
        // Replace all instances of comment bank labels with comment text
        for (const comment of active_report_set.comment_bank) {
            report.compiled_comment = report.compiled_comment.replaceAll(`[${comment.label}]`, comment.text);
        }

        // Update data value entries
        for (const dvl of Object.keys(report.data_values)) {
            report.compiled_comment = report.compiled_comment.replaceAll(`[${dvl}]`, report.data_values[dvl]);
        }

        // Update gender-specific pronouns
        if (report.student.gender.toUpperCase()[0] === "M") {
            report.compiled_comment = report.compiled_comment.replaceAll("[hht]", "his");
            report.compiled_comment = report.compiled_comment.replaceAll("[hst]", "he");
        } else if (report.student.gender.toUpperCase()[0] === "F") {
            report.compiled_comment = report.compiled_comment.replaceAll("[hht]", "her");
            report.compiled_comment = report.compiled_comment.replaceAll("[hst]", "she");
        } else {
            report.compiled_comment = report.compiled_comment.replaceAll("[hht]", "their");
            report.compiled_comment = report.compiled_comment.replaceAll("[hst]", "they");
        }

        // Update student name
        report.compiled_comment = report.compiled_comment.replaceAll("[name]", report.student.firstname);
    }
    update_local_storage();
    alert_unsaved_changes(true);

}

/** Home page function **/
function upload_report_set() {

    const xhr = new XMLHttpRequest();
    const frm = document.getElementById("upload_report_set_form");
    const btn = document.getElementById("upload_report_set_button");
    const fd = new FormData(frm);

    xhr.onloadstart = () => {
        btn.setAttribute('disabled', true);
        btn.value = 'Processing...';
        show_hide_upload_progress_modal("show");
    };

    xhr.onload = ev => {
        if (xhr.status === 200) {

            // Restore upload button
            btn.removeAttribute('disabled');
            btn.value = 'Upload';

            // Clear existing local storage
            clear_local_storage();

            // Redirect to editor page
            window.location.href = '/editor';

        }

        if (xhr.status === 415) {
            // Restore upload button
            show_hide_upload_progress_modal("hide");
            btn.removeAttribute('disabled');
            btn.value = 'Upload';
            document.getElementById("report_set_file").value = "";
            alert(xhr.responseText);

        }
    };

    xhr.onerror = ev => {
        alert("There was a problem when uploading the report set: " + xhr.responseText);
    };

    xhr.open("POST", "/upload_report_set");

    xhr.send(fd)

}

function aeas_upload_status(status) {

    const indicator = document.getElementById("aeas_upload_status");
    const frm = document.getElementById("aeas_upload_form");
    if (status === "uploading") {
        frm.className += " w3-hide";
        indicator.className = indicator.className.replaceAll("w3-hide", "");
    } else {
        indicator.className += " w3-hide";
        frm.className = indicator.className.replaceAll("w3-hide", "");

    }
}

function aeas_upload_handler() {

    const XHR = new XMLHttpRequest();
    const aeas_form = document.getElementById("aeas_upload_form");
    const modal_content = document.getElementById("aeas_modal_content");
    const processing_indicator = document.getElementById("aeas_processing_indicator");

    // Bind the FormData object and the form element
    const FD = new FormData(aeas_form);

    XHR.onloadstart = () => {

        modal_content.className += " w3-hide";
        processing_indicator.className = processing_indicator.className.replaceAll(" w3-hide", "");

    };

    // Define what happens on successful data submission
    XHR.addEventListener("load", (event) => {
        if (XHR.status === 200) {
            show_hide_aeas_modal("hide");
            modal_content.className = modal_content.className.replaceAll(" w3-hide", "");
            processing_indicator.className += " w3-hide";
            window.location.href = XHR.responseText;
        } else if (XHR.status === 415) {
            alert(XHR.responseText);
            show_hide_aeas_modal("hide");
            modal_content.className = modal_content.className.replaceAll(" w3-hide", "");
            processing_indicator.className += " w3-hide";
            window.location.href = '/';

        }
        // alert(XHR.responseText);
    });

    // Define what happens in case of error
    XHR.addEventListener("error", (event) => {
        alert('Oops! Something went wrong.');
        show_hide_aeas_modal("hide");
        modal_content.className = modal_content.className.replaceAll(" w3-hide", "");
        processing_indicator.className += " w3-hide";
    });

    // Set up our request
    XHR.open("POST", "/upload_aeas");

    // The data sent is what the user provided in the form
    XHR.send(FD);


}

function show_hide_aeas_modal(status) {
    const modal = document.getElementById("aeas_modal");
    modal.style.display = status === "show" ? 'block' : 'none';
}

function show_hide_upload_progress_modal(status) {
    const modal = document.getElementById("upload_progress_modal");
    modal.style.display = status === "show" ? 'block' : 'none';
}

function show_hide_download_progress_modal(status) {
    const modal = document.getElementById("download_progress_modal");
    modal.style.display = status === "show" ? 'block' : 'none';
}