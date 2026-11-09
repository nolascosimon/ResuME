
var DB_NAME = "resume.db";
var db = null;

var DB_SCHEMA = [
    "CREATE TABLE IF NOT EXISTS settings (" +
        "key TEXT PRIMARY KEY NOT NULL, " +
        "value TEXT)",

    "CREATE TABLE IF NOT EXISTS profile (" +
        "id INTEGER PRIMARY KEY NOT NULL, " +
        "name TEXT NOT NULL DEFAULT '', " +
        "program TEXT NOT NULL DEFAULT '', " +
        "year TEXT NOT NULL DEFAULT '', " +
        "email TEXT NOT NULL DEFAULT '', " +
        "phone TEXT NOT NULL DEFAULT '', " +
        "address TEXT NOT NULL DEFAULT '')",

    "CREATE TABLE IF NOT EXISTS entries (" +
        "id TEXT PRIMARY KEY NOT NULL, " +
        "title TEXT NOT NULL, " +
        "category TEXT NOT NULL, " +
        "date TEXT NOT NULL, " +
        "school_year TEXT NOT NULL, " +
        "semester TEXT NOT NULL, " +
        "description TEXT NOT NULL DEFAULT '', " +
        "position INTEGER NOT NULL DEFAULT 0)",

    "CREATE TABLE IF NOT EXISTS proofs (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "entry_id TEXT NOT NULL, " +
        "name TEXT NOT NULL, " +
        "type TEXT NOT NULL, " +
        "file TEXT NOT NULL DEFAULT '', " +
        "scan_later INTEGER NOT NULL DEFAULT 0, " +
        "position INTEGER NOT NULL DEFAULT 0)",
    "CREATE INDEX IF NOT EXISTS idx_proofs_entry ON proofs (entry_id)",

    "CREATE TABLE IF NOT EXISTS resumes (" +
        "id TEXT PRIMARY KEY NOT NULL, " +
        "name TEXT NOT NULL, " +
        "type TEXT NOT NULL, " +
        "template TEXT NOT NULL, " +
        "summary TEXT NOT NULL DEFAULT '', " +
        "position INTEGER NOT NULL DEFAULT 0)",

    "CREATE TABLE IF NOT EXISTS resume_entries (" +
        "resume_id TEXT NOT NULL, " +
        "entry_id TEXT NOT NULL, " +
        "position INTEGER NOT NULL DEFAULT 0, " +
        "PRIMARY KEY (resume_id, entry_id))",

    "CREATE TABLE IF NOT EXISTS reminders (" +
        "id TEXT PRIMARY KEY NOT NULL, " +
        "school_year TEXT NOT NULL, " +
        "semester TEXT NOT NULL, " +
        "end_date TEXT NOT NULL DEFAULT '', " +
        "on_flag INTEGER NOT NULL DEFAULT 1, " +
        "position INTEGER NOT NULL DEFAULT 0)"
];

function dbLog(where, err) {
    console.error("ResuME database error (" + where + "): " + (err && err.message ? err.message : err));
}

function emptyData() {
    return {
        welcomed: false,
        aiAccepted: false,
        profile: { name: "", program: "", year: "", email: "", phone: "", address: "" },
        entries: [],
        resumes: [],
        reminders: []
    };
}

function dbRows(rs) {
    var rows = [];
    for (var i = 0; i < rs.rows.length; i++) rows.push(rs.rows.item(i));
    return rows;
}

function dbAssemble(raw) {
    var d = emptyData();
    var migrated = false;

    raw.settings.forEach(function (s) {
        if (s.key == "welcomed") d.welcomed = s.value == "1";
        if (s.key == "aiAccepted") d.aiAccepted = s.value == "1";
        if (s.key == "migrated") migrated = true;
    });

    if (raw.profile.length > 0) {
        var p = raw.profile[0];
        d.profile = { name: p.name, program: p.program, year: p.year, email: p.email, phone: p.phone, address: p.address };
    }

    var entryById = {};
    raw.entries.forEach(function (e) {
        var entry = {
            id: e.id,
            title: e.title,
            category: e.category,
            date: e.date,
            schoolYear: e.school_year,
            semester: e.semester,
            description: e.description,
            proofs: []
        };
        entryById[e.id] = entry;
        d.entries.push(entry);
    });
    raw.proofs.forEach(function (x) {
        var entry = entryById[x.entry_id];
        if (!entry) return;
        var proof = { name: x.name, type: x.type };
        if (x.file) proof.file = x.file;
        if (x.scan_later == 1) proof.scanLater = true;
        entry.proofs.push(proof);
    });

    var resumeById = {};
    raw.resumes.forEach(function (r) {
        var resume = { id: r.id, name: r.name, type: r.type, template: r.template, summary: r.summary, entryIds: [] };
        resumeById[r.id] = resume;
        d.resumes.push(resume);
    });
    raw.resumeEntries.forEach(function (x) {
        if (resumeById[x.resume_id]) resumeById[x.resume_id].entryIds.push(x.entry_id);
    });

    raw.reminders.forEach(function (r) {
        d.reminders.push({ id: r.id, schoolYear: r.school_year, semester: r.semester, end: r.end_date, on: r.on_flag == 1 });
    });

    return { data: d, migrated: migrated };
}

function dbStatements(d) {
    var st = [
        "DELETE FROM settings",
        "DELETE FROM profile",
        "DELETE FROM entries",
        "DELETE FROM proofs",
        "DELETE FROM resumes",
        "DELETE FROM resume_entries",
        "DELETE FROM reminders"
    ];

    st.push(["INSERT INTO settings (key, value) VALUES (?, ?)", ["welcomed", d.welcomed ? "1" : "0"]]);
    st.push(["INSERT INTO settings (key, value) VALUES (?, ?)", ["aiAccepted", d.aiAccepted ? "1" : "0"]]);
    st.push(["INSERT INTO settings (key, value) VALUES (?, ?)", ["migrated", "1"]]);

    var p = d.profile;
    st.push(["INSERT INTO profile (id, name, program, year, email, phone, address) VALUES (1, ?, ?, ?, ?, ?, ?)",
        [p.name || "", p.program || "", p.year || "", p.email || "", p.phone || "", p.address || ""]]);

    d.entries.forEach(function (e, i) {
        st.push(["INSERT INTO entries (id, title, category, date, school_year, semester, description, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [String(e.id), e.title, e.category, e.date, e.schoolYear, e.semester, e.description || "", i]]);
        (e.proofs || []).forEach(function (x, j) {
            st.push(["INSERT INTO proofs (entry_id, name, type, file, scan_later, position) VALUES (?, ?, ?, ?, ?, ?)",
                [String(e.id), x.name, x.type, x.file || "", x.scanLater ? 1 : 0, j]]);
        });
    });

    d.resumes.forEach(function (r, i) {
        st.push(["INSERT INTO resumes (id, name, type, template, summary, position) VALUES (?, ?, ?, ?, ?, ?)",
            [String(r.id), r.name, r.type, r.template, r.summary || "", i]]);
        (r.entryIds || []).forEach(function (entryId, j) {
            st.push(["INSERT OR IGNORE INTO resume_entries (resume_id, entry_id, position) VALUES (?, ?, ?)",
                [String(r.id), String(entryId), j]]);
        });
    });

    d.reminders.forEach(function (r, i) {
        st.push(["INSERT INTO reminders (id, school_year, semester, end_date, on_flag, position) VALUES (?, ?, ?, ?, ?, ?)",
            [String(r.id), r.schoolYear, r.semester, r.end || "", r.on ? 1 : 0, i]]);
    });

    return st;
}

function dbSave(done) {
    var statements = dbStatements(data);
    db.sqlBatch(statements, function () {
        if (done) done(true);
    }, function (err) {
        dbLog("save", err);
        if (typeof toast == "function") toast("Could not save your changes");
        if (done) done(false);
    });
}

function dbMigrateOld() {
    var saved = null;
    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
        saved = null;
    }
    if (!saved) return null;
    try {
        var old = JSON.parse(saved);
        var d = emptyData();
        Object.keys(d).forEach(function (k) {
            if (old[k] !== undefined && old[k] !== null) d[k] = old[k];
        });
        return d;
    } catch (e) {
        return null;
    }
}

function dbLoad(done) {
    function giveUp(err) {
        dbLog("load", err);
        db = null;
        done(false);
    }

    try {
        db = window.sqlitePlugin.openDatabase({ name: DB_NAME, location: "default" });
    } catch (e) {
        giveUp(e);
        return;
    }

    function addFileColumn(next) {
        db.executeSql("PRAGMA table_info(proofs)", [], function (rs) {
            var hasFile = dbRows(rs).some(function (c) { return c.name == "file"; });
            if (hasFile) {
                next();
                return;
            }
            db.executeSql("ALTER TABLE proofs ADD COLUMN file TEXT NOT NULL DEFAULT ''", [], next, giveUp);
        }, giveUp);
    }

    db.sqlBatch(DB_SCHEMA, function () {
        addFileColumn(readAll);
    }, giveUp);

    function readAll() {
        var raw = {};
        db.readTransaction(function (tx) {
            tx.executeSql("SELECT key, value FROM settings", [], function (t, rs) { raw.settings = dbRows(rs); });
            tx.executeSql("SELECT name, program, year, email, phone, address FROM profile WHERE id = 1", [], function (t, rs) { raw.profile = dbRows(rs); });
            tx.executeSql("SELECT * FROM entries ORDER BY position", [], function (t, rs) { raw.entries = dbRows(rs); });
            tx.executeSql("SELECT * FROM proofs ORDER BY entry_id, position", [], function (t, rs) { raw.proofs = dbRows(rs); });
            tx.executeSql("SELECT * FROM resumes ORDER BY position", [], function (t, rs) { raw.resumes = dbRows(rs); });
            tx.executeSql("SELECT * FROM resume_entries ORDER BY resume_id, position", [], function (t, rs) { raw.resumeEntries = dbRows(rs); });
            tx.executeSql("SELECT * FROM reminders ORDER BY position", [], function (t, rs) { raw.reminders = dbRows(rs); });
        }, giveUp, function () {
            var result = dbAssemble(raw);
            data = result.data;
            if (!result.migrated) {
                var old = dbMigrateOld();
                if (old) data = old;
                dbSave(function (ok) {
                    if (ok && old) {
                        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
                    }
                    done(true);
                });
                return;
            }
            done(true);
        });
    }
}
