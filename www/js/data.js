var STORAGE_KEY = "resume_data";

var categories = ["Org Event", "Training", "Hackathon", "School Project", "Award"];
var semesters = ["1st Semester", "2nd Semester", "Summer"];
var yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
var templates = ["Classic", "Modern", "Compact"];
var resumeTypes = ["OJT", "Scholarship", "Job"];
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var data = {
    welcomed: false,
    aiAccepted: false,
    profile: { name: "", program: "", year: "", email: "", phone: "", address: "" },
    entries: [],
    resumes: [],
    reminders: []
};

function loadData(done) {
    function fromLocalStorage() {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            data = JSON.parse(saved);
        }
        done();
    }

    if (window.sqlitePlugin) {
        dbLoad(function (ok) {
            if (ok) done();
            else fromLocalStorage();
        });
    } else {
        fromLocalStorage();
    }
}

function saveData() {
    if (db) {
        dbSave();
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
}

function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function esc(text) {
    return String(text == null ? "" : text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function two(n) {
    return n < 10 ? "0" + n : "" + n;
}

function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
}

function toDate(str) {
    return new Date(str + "T00:00:00");
}

function formatDate(str) {
    var d = toDate(str);
    return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}

function monthYear(str) {
    var d = toDate(str);
    return months[d.getMonth()] + " " + d.getFullYear();
}

function getSemester(str) {
    var m = toDate(str).getMonth() + 1;
    if (m >= 8) return "1st Semester";
    if (m >= 6) return "Summer";
    return "2nd Semester";
}

function getSchoolYear(str) {
    var d = toDate(str);
    var y = d.getFullYear();
    if (d.getMonth() + 1 >= 6) return y + "-" + (y + 1);
    return (y - 1) + "-" + y;
}

function schoolYearOptions() {
    var now = new Date();
    var start = now.getMonth() + 1 >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    var list = [];
    for (var i = 0; i < 6; i++) {
        list.push((start - i) + "-" + (start - i + 1));
    }
    return list;
}

function semesterOrder(sem) {
    return semesters.indexOf(sem);
}

function groupEntries() {
    var groups = {};
    data.entries.forEach(function (e) {
        var key = e.schoolYear + "|" + e.semester;
        if (!groups[key]) {
            groups[key] = { schoolYear: e.schoolYear, semester: e.semester, items: [] };
        }
        groups[key].items.push(e);
    });
    var list = Object.keys(groups).map(function (k) { return groups[k]; });
    list.sort(function (a, b) {
        if (a.schoolYear != b.schoolYear) return a.schoolYear < b.schoolYear ? 1 : -1;
        return semesterOrder(b.semester) - semesterOrder(a.semester);
    });
    list.forEach(function (g) {
        g.items.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    });
    return list;
}

function findEntry(id) {
    return data.entries.filter(function (e) { return e.id == id; })[0];
}

function findResume(id) {
    return data.resumes.filter(function (r) { return r.id == id; })[0];
}

function options(list, selected, placeholder) {
    var html = placeholder ? '<option value="">' + placeholder + "</option>" : "";
    list.forEach(function (item) {
        html += '<option value="' + esc(item) + '"' + (item == selected ? " selected" : "") + ">" + esc(item) + "</option>";
    });
    return html;
}
