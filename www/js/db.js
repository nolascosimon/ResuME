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

function dbRows(resultSet) {
    var rows = [];
    for (var i = 0; i < resultSet.rows.length; i++) rows.push(resultSet.rows.item(i));
    return rows;
}

function dbAssemble(raw) {
    var loaded = emptyData();
    var migrated = false;

    raw.settings.forEach(function (setting) {
        if (setting.key == "welcomed") loaded.welcomed = setting.value == "1";
        if (setting.key == "aiAccepted") loaded.aiAccepted = setting.value == "1";
        if (setting.key == "migrated") migrated = true;
    });

    if (raw.profile.length > 0) {
        var profile = raw.profile[0];
        loaded.profile = {
            name: profile.name,
            program: profile.program,
            year: profile.year,
            email: profile.email,
            phone: profile.phone,
            address: profile.address
        };
    }

    var entryById = {};
    raw.entries.forEach(function (row) {
        var entry = {
            id: row.id,
            title: row.title,
            category: row.category,
            date: row.date,
            schoolYear: row.school_year,
            semester: row.semester,
            description: row.description,
            proofs: []
        };
        entryById[row.id] = entry;
        loaded.entries.push(entry);
    });

    raw.proofs.forEach(function (row) {
        var entry = entryById[row.entry_id];
        if (!entry) return;
        var proof = { name: row.name, type: row.type };
        if (row.file) proof.file = row.file;
        if (row.scan_later == 1) proof.scanLater = true;
        entry.proofs.push(proof);
    });

    var resumeById = {};
    raw.resumes.forEach(function (row) {
        var resume = {
            id: row.id,
            name: row.name,
            type: row.type,
            template: row.template,
            summary: row.summary,
            entryIds: []
        };
        resumeById[row.id] = resume;
        loaded.resumes.push(resume);
    });
    raw.resumeEntries.forEach(function (row) {
        if (resumeById[row.resume_id]) resumeById[row.resume_id].entryIds.push(row.entry_id);
    });

    raw.reminders.forEach(function (row) {
        loaded.reminders.push({
            id: row.id,
            schoolYear: row.school_year,
            semester: row.semester,
            end: row.end_date,
            on: row.on_flag == 1
        });
    });

    return { data: loaded, migrated: migrated };
}

function dbStatements(source) {
    var statements = [
        "DELETE FROM settings",
        "DELETE FROM profile",
        "DELETE FROM entries",
        "DELETE FROM proofs",
        "DELETE FROM resumes",
        "DELETE FROM resume_entries",
        "DELETE FROM reminders"
    ];

    statements.push(["INSERT INTO settings (key, value) VALUES (?, ?)", ["welcomed", source.welcomed ? "1" : "0"]]);
    statements.push(["INSERT INTO settings (key, value) VALUES (?, ?)", ["aiAccepted", source.aiAccepted ? "1" : "0"]]);
    statements.push(["INSERT INTO settings (key, value) VALUES (?, ?)", ["migrated", "1"]]);

    var profile = source.profile;
    statements.push(["INSERT INTO profile (id, name, program, year, email, phone, address) VALUES (1, ?, ?, ?, ?, ?, ?)",
        [profile.name || "", profile.program || "", profile.year || "", profile.email || "", profile.phone || "", profile.address || ""]]);

    source.entries.forEach(function (entry, entryIndex) {
        statements.push(["INSERT INTO entries (id, title, category, date, school_year, semester, description, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [String(entry.id), entry.title, entry.category, entry.date, entry.schoolYear, entry.semester, entry.description || "", entryIndex]]);
        (entry.proofs || []).forEach(function (proof, proofIndex) {
            statements.push(["INSERT INTO proofs (entry_id, name, type, file, scan_later, position) VALUES (?, ?, ?, ?, ?, ?)",
                [String(entry.id), proof.name, proof.type, proof.file || "", proof.scanLater ? 1 : 0, proofIndex]]);
        });
    });

    source.resumes.forEach(function (resume, resumeIndex) {
        statements.push(["INSERT INTO resumes (id, name, type, template, summary, position) VALUES (?, ?, ?, ?, ?, ?)",
            [String(resume.id), resume.name, resume.type, resume.template, resume.summary || "", resumeIndex]]);
        (resume.entryIds || []).forEach(function (entryId, entryIndex) {
            statements.push(["INSERT OR IGNORE INTO resume_entries (resume_id, entry_id, position) VALUES (?, ?, ?)",
                [String(resume.id), String(entryId), entryIndex]]);
        });
    });

    source.reminders.forEach(function (reminder, index) {
        statements.push(["INSERT INTO reminders (id, school_year, semester, end_date, on_flag, position) VALUES (?, ?, ?, ?, ?, ?)",
            [String(reminder.id), reminder.schoolYear, reminder.semester, reminder.end || "", reminder.on ? 1 : 0, index]]);
    });

    return statements;
}

function dbSave(done) {
    db.sqlBatch(dbStatements(data), function () {
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
    } catch (err) {
        dbLog("read local data for migration", err);
        return null;
    }
    if (!saved) return null;

    try {
        var previousData = JSON.parse(saved);
        var migratedData = emptyData();
        Object.keys(migratedData).forEach(function (key) {
            if (previousData[key] !== undefined && previousData[key] !== null) {
                migratedData[key] = previousData[key];
            }
        });
        return migratedData;
    } catch (err) {
        dbLog("parse local data for migration", err);
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
    } catch (err) {
        giveUp(err);
        return;
    }

    function addFileColumn(next) {
        db.executeSql("PRAGMA table_info(proofs)", [], function (resultSet) {
            var hasFileColumn = dbRows(resultSet).some(function (column) {
                return column.name == "file";
            });
            if (hasFileColumn) {
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
            tx.executeSql("SELECT key, value FROM settings", [], function (transaction, resultSet) { raw.settings = dbRows(resultSet); });
            tx.executeSql("SELECT name, program, year, email, phone, address FROM profile WHERE id = 1", [], function (transaction, resultSet) { raw.profile = dbRows(resultSet); });
            tx.executeSql("SELECT * FROM entries ORDER BY position", [], function (transaction, resultSet) { raw.entries = dbRows(resultSet); });
            tx.executeSql("SELECT * FROM proofs ORDER BY entry_id, position", [], function (transaction, resultSet) { raw.proofs = dbRows(resultSet); });
            tx.executeSql("SELECT * FROM resumes ORDER BY position", [], function (transaction, resultSet) { raw.resumes = dbRows(resultSet); });
            tx.executeSql("SELECT * FROM resume_entries ORDER BY resume_id, position", [], function (transaction, resultSet) { raw.resumeEntries = dbRows(resultSet); });
            tx.executeSql("SELECT * FROM reminders ORDER BY position", [], function (transaction, resultSet) { raw.reminders = dbRows(resultSet); });
        }, giveUp, function () {
            var result = dbAssemble(raw);
            data = result.data;
            if (!result.migrated) {
                var previousData = dbMigrateOld();
                if (previousData) data = previousData;
                dbSave(function (ok) {
                    if (ok && previousData) {
                        try {
                            localStorage.removeItem(STORAGE_KEY);
                        } catch (err) {
                            dbLog("remove migrated local data", err);
                        }
                    }
                    done(true);
                });
                return;
            }
            done(true);
        });
    }
}
