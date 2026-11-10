var screens = {};

function emptyMessage(icon, text) {
    return '<div class="empty"><i class="bi ' + icon + '"></i><p>' + text + "</p></div>";
}

screens.welcome = {
    title: "ResuME",
    noBar: true,
    render: function () {
        return '<div class="brand"><h2>ResuME</h2><p>Keep your achievements and certificates in one place.</p></div>' +
            '<div class="field"><label for="w-name">Full name</label><input id="w-name" class="form-control" placeholder="Simon Nolasco"><div class="error-text">Enter your name.</div></div>' +
            '<div class="field"><label for="w-prog">Program</label><input id="w-prog" class="form-control" placeholder="BS Information Technology"><div class="error-text">Enter your program.</div></div>' +
            '<div class="field"><label for="w-year">Year level</label><select id="w-year" class="form-select">' + options(yearLevels, "", "Select year level") + '</select><div class="error-text">Pick your year level.</div></div>' +
            '<button id="w-go" class="btn btn-navy w-100 mt-2">Get Started</button>';
    },
    setup: function (el) {
        el.querySelector("#w-go").onclick = function () {
            var name = el.querySelector("#w-name");
            var program = el.querySelector("#w-prog");
            var year = el.querySelector("#w-year");
            name.classList.toggle("is-invalid", !name.value.trim());
            program.classList.toggle("is-invalid", !program.value.trim());
            year.classList.toggle("is-invalid", !year.value);
            if (el.querySelector(".is-invalid")) return;
            data.profile.name = name.value.trim();
            data.profile.program = program.value.trim();
            data.profile.year = year.value;
            data.welcomed = true;
            saveData();
            goTab("timeline");
        };
    }
};

screens.timeline = {
    title: "Timeline",
    tab: true,
    fab: {
        label: "Add entry",
        action: function () { go("entryForm", { draft: newDraft(false) }); }
    },
    render: function () {
        var html = '<button id="add-past" class="btn btn-outline-navy w-100">Add Past Achievement</button>';
        if (data.entries.length == 0) {
            return html + emptyMessage("bi-journal-plus", "No achievements yet. Tap the plus button to add your first one.");
        }
        groupEntries().forEach(function (g) {
            html += '<div class="group-title">' + g.schoolYear + ", " + g.semester.toUpperCase() + '</div><div class="list-card">';
            g.items.forEach(function (e) {
                html += '<button class="row-item" data-id="' + e.id + '"><div class="row-main"><div class="row-title">' + esc(e.title) + "</div>" +
                    '<div class="row-sub">' + esc(e.category) + " · " + formatDate(e.date) + "</div></div>";
                if (e.proofs.length > 0) {
                    html += '<span class="proof-count"><i class="bi bi-paperclip"></i>' + e.proofs.length + "</span>";
                }
                html += "</button>";
            });
            html += "</div>";
        });
        return html;
    },
    setup: function (el) {
        el.querySelector("#add-past").onclick = function () {
            go("entryForm", { draft: newDraft(true) });
        };
        el.querySelectorAll("[data-id]").forEach(function (row) {
            row.onclick = function () {
                go("details", { id: row.getAttribute("data-id") });
            };
        });
    }
};

function newDraft(past) {
    var date = past ? "" : todayStr();
    return {
        past: past,
        editing: false,
        title: "",
        category: "",
        date: date,
        schoolYear: date ? getSchoolYear(date) : schoolYearOptions()[0],
        semester: date ? getSemester(date) : "1st Semester",
        semesterPicked: false,
        description: "",
        proofs: []
    };
}

screens.entryForm = {
    title: function (p) {
        if (p.draft.editing) return "Edit Entry";
        return p.draft.past ? "Add Past Achievement" : "Add Entry";
    },
    render: function (p) {
        var d = p.draft;
        var chips = categories.map(function (c) {
            return '<button type="button" class="chip' + (d.category == c ? " on" : "") + '" data-v="' + c + '">' + c + "</button>";
        }).join("");
        var html = '<div class="field"><label for="f-title">Title <span class="req">*</span></label><input id="f-title" class="form-control" maxlength="80" value="' + esc(d.title) + '"><div class="error-text">Enter a title.</div></div>' +
            '<div class="field"><span class="label">Category <span class="req">*</span></span><div class="chips" id="f-cat">' + chips + '</div><div class="error-text" id="cat-error">Pick a category.</div></div>';
        if (d.past) {
            html += '<div class="field"><label for="f-year">School year</label><select id="f-year" class="form-select">' + options(schoolYearOptions(), d.schoolYear) + "</select></div>";
        }
        html += '<div class="row g-2"><div class="col-6 field"><label for="f-date">Date <span class="req">*</span></label><input id="f-date" type="date" class="form-control" max="' + todayStr() + '" value="' + d.date + '"><div class="error-text">Pick a date.</div></div>' +
            '<div class="col-6 field"><label for="f-sem">Semester</label><select id="f-sem" class="form-select">' + options(semesters, d.semester) + "</select></div></div>" +
            '<div class="field"><label for="f-desc">Description</label><textarea id="f-desc" class="form-control" rows="3" maxlength="400">' + esc(d.description) + "</textarea>" +
            '<div class="mt-2">' + aiButton("f-improve", "Improve wording", "btn-line btn-sm-chip") + "</div></div>" +
            '<div class="field"><span class="label">Proof</span>' +
            '<div class="btn-row mb-2"><button type="button" id="f-cam" class="btn btn-line"><i class="bi bi-camera"></i>Camera</button><button type="button" id="f-file" class="btn btn-line"><i class="bi bi-file-earmark"></i>File</button></div>' +
            aiButton("f-scan", '<i class="bi bi-upc-scan"></i>Scan certificate', "btn-line w-100") +
            '<div id="f-tags" class="mt-2"></div></div>' +
            '<button id="f-save" class="btn btn-navy w-100">Save</button>';
        return html;
    },
    setup: function (el, p) {
        var d = p.draft;

        function readForm() {
            d.title = el.querySelector("#f-title").value;
            d.date = el.querySelector("#f-date").value;
            d.semester = el.querySelector("#f-sem").value;
            d.description = el.querySelector("#f-desc").value;
            var year = el.querySelector("#f-year");
            if (year) d.schoolYear = year.value;
        }

        function showTags() {
            var box = el.querySelector("#f-tags");
            box.innerHTML = d.proofs.map(function (proof, i) {
                return '<span class="file-tag">' + esc(proof.name) + ' <button type="button" data-remove="' + i + '">&times;</button></span>';
            }).join("");
            box.querySelectorAll("[data-remove]").forEach(function (b) {
                b.onclick = function () {
                    d.proofs.splice(b.getAttribute("data-remove"), 1);
                    showTags();
                };
            });
        }

        showTags();

        setupChips(el.querySelector("#f-cat"), function (value) {
            d.category = value;
            el.querySelector("#cat-error").classList.remove("show");
        });

        el.querySelector("#f-date").onchange = function () {
            var date = this.value;
            if (!date) return;
            if (!d.semesterPicked) el.querySelector("#f-sem").value = getSemester(date);
            if (el.querySelector("#f-year")) el.querySelector("#f-year").value = getSchoolYear(date);
        };

        el.querySelector("#f-sem").onchange = function () {
            d.semesterPicked = true;
        };

        el.querySelector("#f-cam").onclick = function () {
            pickPhoto(true, function (uri, name) {
                storeProof(dataUrlToBlob(uri), name, function (path) {
                    d.proofs.push({ id: newId(), name: name, type: "image", file: path });
                    showTags();
                });
            });
        };

        el.querySelector("#f-file").onclick = function () {
            pickFile(function (file) {
                storeProof(file, file.name, function (path) {
                    d.proofs.push({ id: newId(), name: file.name, type: proofType(file.name), file: path });
                    showTags();
                });
            });
        };

        el.querySelector("#f-improve").onclick = function () {
            readForm();
            if (!d.description.trim()) {
                toast("Write a short note first");
                return;
            }
            useAI("suggest", { draft: d });
        };

        el.querySelector("#f-scan").onclick = function () {
            readForm();
            useAI("scan", { draft: d });
        };

        el.querySelector("#f-save").onclick = function () {
            readForm();
            var title = el.querySelector("#f-title");
            var date = el.querySelector("#f-date");
            title.classList.toggle("is-invalid", !d.title.trim());
            date.classList.toggle("is-invalid", !d.date);
            el.querySelector("#cat-error").classList.toggle("show", !d.category);
            if (!d.title.trim() || !d.date || !d.category) return;

            var entry = {
                id: d.id || newId(),
                title: d.title.trim(),
                category: d.category,
                date: d.date,
                schoolYear: d.past ? d.schoolYear : getSchoolYear(d.date),
                semester: d.semester,
                description: d.description.trim(),
                proofs: d.proofs
            };
            if (d.editing) {
                data.entries = data.entries.map(function (e) { return e.id == entry.id ? entry : e; });
            } else {
                data.entries.push(entry);
            }
            saveData();
            goTab("timeline");
        };
    }
};

function reword(text) {
    var t = text.replace(/\s+/g, " ").trim();
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (!/[.!?]$/.test(t)) t += ".";
    if (/^(half|full|one|two|three)[\s-]/i.test(t)) {
        t = "Attended a " + t.charAt(0).toLowerCase() + t.slice(1);
    }
    return t;
}

screens.suggest = {
    title: "Description Suggestion",
    render: function (p) {
        if (!p.reworded) p.reworded = reword(p.draft.description);
        return '<div class="compare"><div class="box"><b>Your note</b>' + esc(p.draft.description) + "</div>" +
            '<div class="box new"><b>Reworded <span class="ai-tag">AI</span></b>' +
            '<textarea id="s-new" class="form-control border-0 p-0 mt-1" rows="3" style="background:transparent">' + esc(p.reworded) + "</textarea></div></div>" +
            '<div class="note"><i class="bi bi-info-circle"></i><span>The AI can be wrong. Check the wording before using it.</span></div>' +
            '<div class="btn-row"><button id="s-keep" class="btn btn-line">Keep original</button><button id="s-use" class="btn btn-navy">Use this</button></div>';
    },
    setup: function (el, p) {
        el.querySelector("#s-use").onclick = function () {
            var text = el.querySelector("#s-new").value.trim();
            if (text) p.draft.description = text;
            back();
        };
        el.querySelector("#s-keep").onclick = back;
    }
};

screens.details = {
    title: "Entry Details",
    render: function (p) {
        var e = findEntry(p.id);
        if (!e) return emptyMessage("bi-exclamation-circle", "This entry is no longer available.");
        var proofs = '<p class="muted small mb-0">No proof attached.</p>';
        if (e.proofs && e.proofs.length > 0) {
            proofs = '<div class="proof-strip">' + e.proofs.map(function (x, index) {
                var icon = x.type == "pdf" ? "bi-file-earmark-pdf" : "bi-image";
                return '<button type="button" class="proof-thumb" data-proof-index="' + index + '" aria-label="View ' + esc(x.name) + '">' +
                    '<i class="bi ' + icon + '"></i><span>' + esc(x.name) + "</span></button>";
            }).join("") + "</div>";
        }
        return '<h2 class="detail-title">' + esc(e.title) + "</h2>" +
            '<div class="detail-meta"><span class="chip">' + e.category + '</span><span class="chip">' + formatDate(e.date) + '</span><span class="chip">' + e.schoolYear + ", " + e.semester + "</span></div>" +
            '<div class="label">Description</div><div class="detail-text">' + (e.description ? esc(e.description) : '<span class="muted">No description.</span>') + "</div>" +
            '<div class="label">Proof</div>' + proofs +
            '<div class="btn-row section-gap"><button id="d-edit" class="btn btn-line"><i class="bi bi-pencil"></i>Edit</button><button id="d-delete" class="btn btn-danger-line"><i class="bi bi-trash"></i>Delete</button></div>';
    },
    setup: function (el, p) {
        if (!findEntry(p.id)) return;
        el.querySelectorAll("[data-proof-index]").forEach(function (button) {
            button.onclick = function () {
                go("proofViewer", {
                    entryId: p.id,
                    proofIndex: Number(button.getAttribute("data-proof-index"))
                });
            };
        });
        el.querySelector("#d-edit").onclick = function () {
            var draft = JSON.parse(JSON.stringify(findEntry(p.id)));
            draft.editing = true;
            draft.past = false;
            draft.semesterPicked = true;
            go("entryForm", { draft: draft });
        };
        el.querySelector("#d-delete").onclick = function () {
            confirmBox("Delete this entry?", "The entry and its proof will be removed from this phone.", "Delete", function () {
                data.entries = data.entries.filter(function (e) { return e.id != p.id; });
                data.resumes.forEach(function (r) {
                    r.entryIds = r.entryIds.filter(function (id) { return id != p.id; });
                });
                saveData();
                goTab("timeline");
            });
        };
    }
};

screens.proofViewer = {
    title: "Proof Viewer",
    render: function (p) {
        var entry = findEntry(p.entryId);
        var proof = entry && entry.proofs && entry.proofs[p.proofIndex];
        if (!proof) return emptyMessage("bi-exclamation-circle", "This proof is no longer available.");
        if (!proof.file) return emptyMessage("bi-file-earmark-x", "The proof file could not be found.");

        if (proof.type == "pdf") {
            var openButton = window.cordova ?
                '<button type="button" id="proof-open-pdf" class="btn btn-line w-100 mt-3">Open PDF</button>' : "";
            return '<iframe class="proof-document" title="' + esc(proof.name) + '" src="' + esc(proof.file) + '"></iframe>' + openButton;
        }
        return '<div class="proof-viewer-image"><img id="proof-image" alt="' + esc(proof.name) + '" src="' + esc(proof.file) + '"></div>';
    },
    setup: function (el, p) {
        var entry = findEntry(p.entryId);
        var proof = entry && entry.proofs && entry.proofs[p.proofIndex];
        if (!proof || !proof.file) return;

        if (proof.type == "pdf") {
            var openButton = el.querySelector("#proof-open-pdf");
            if (!openButton) return;
            openButton.onclick = function () {
                var opener = window.cordova && cordova.plugins && cordova.plugins.fileOpener2;
                if (!opener) {
                    toast("A PDF viewer is not available on this device");
                    return;
                }
                opener.open(proof.file, "application/pdf", {
                    success: function () {},
                    error: function (err) {
                        console.error("Could not open proof PDF:", err);
                        toast("The PDF could not be opened");
                    }
                });
            };
            return;
        }

        if (!/^data:|^blob:/i.test(proof.file) && window.resolveLocalFileSystemURL) {
            resolveLocalFileSystemURL(proof.file, function (fileEntry) {
                fileEntry.file(function (file) {
                    var reader = new FileReader();
                    reader.onload = function () {
                        el.querySelector("#proof-image").src = reader.result;
                    };
                    reader.onerror = function () {
                        toast("The proof image could not be loaded");
                    };
                    reader.readAsDataURL(file);
                }, function (err) {
                    console.error("Could not read proof image:", err);
                    toast("The proof image could not be loaded");
                });
            }, function (err) {
                console.error("Could not find proof image:", err);
                toast("The proof image could not be found");
            });
        }
    }
};

screens.scan = {
    title: "Scan Certificate",
    render: function (p) {
        var box = p.photo ? '<img alt="Certificate photo" src="' + p.photo + '">' : '<i class="bi bi-image"></i><span>certificate photo</span>';
        var html = '<div class="photo-box mb-3">' + box + "</div>";
        if (!p.photo) {
            return html + '<div class="btn-row"><button id="sc-cam" class="btn btn-navy"><i class="bi bi-camera"></i>Take photo</button><button id="sc-pick" class="btn btn-line"><i class="bi bi-images"></i>Choose photo</button></div>';
        }
        if (!isOnline()) {
            return html + '<div class="note"><i class="bi bi-wifi-off"></i><span>No internet. The photo will be saved with the entry so you can scan it later.</span></div>' +
                '<div class="btn-row"><button id="sc-later" class="btn btn-navy wide">Save photo with entry</button><button id="sc-retake" class="btn btn-line">Retake</button></div>';
        }
        return html + '<div class="panel"><div class="panel-head">Suggested details <span class="ai-tag">AI</span></div>' +
            '<div class="kv"><small>Title</small><input id="sc-title" class="bare" value="XCites Cybersecurity Event"></div>' +
            '<div class="kv"><small>Issuer</small><input id="sc-issuer" class="bare" value="College of Computer Studies"></div>' +
            '<div class="kv"><small>Date</small><input id="sc-date" type="date" class="bare" value="2025-09-20"></div></div>' +
            '<div class="note"><i class="bi bi-exclamation-circle"></i><span>The AI can be wrong. Check each detail before using it.</span></div>' +
            '<div class="btn-row"><button id="sc-use" class="btn btn-navy wide">Use These Details</button><button id="sc-retake" class="btn btn-line">Retake</button></div>';
    },
    setup: function (el, p) {
        function choose(fromCamera) {
            pickPhoto(fromCamera, function (uri, name) {
                p.photo = uri;
                p.name = name;
                refresh();
            });
        }
        if (el.querySelector("#sc-cam")) {
            el.querySelector("#sc-cam").onclick = function () { choose(true); };
            el.querySelector("#sc-pick").onclick = function () { choose(false); };
        }
        if (el.querySelector("#sc-retake")) {
            el.querySelector("#sc-retake").onclick = function () {
                p.photo = null;
                refresh();
            };
        }
        if (el.querySelector("#sc-later")) {
            el.querySelector("#sc-later").onclick = function () {
                storeProof(dataUrlToBlob(p.photo), p.name, function (path) {
                    p.draft.proofs.push({ id: newId(), name: p.name, type: "image", file: path, scanLater: true });
                    back();
                });
            };
        }
        if (el.querySelector("#sc-use")) {
            el.querySelector("#sc-use").onclick = function () {
                var title = el.querySelector("#sc-title").value.trim();
                var date = el.querySelector("#sc-date").value;
                if (title) p.draft.title = title;
                if (date) {
                    p.draft.date = date;
                    if (!p.draft.semesterPicked) p.draft.semester = getSemester(date);
                    if (!p.draft.past) p.draft.schoolYear = getSchoolYear(date);
                }
                storeProof(dataUrlToBlob(p.photo), p.name, function (path) {
                    p.draft.proofs.push({ id: newId(), name: p.name, type: "image", file: path });
                    back();
                });
            };
        }
    }
};

screens.aiNotice = {
    title: "AI Notice",
    render: function (p) {
        var html = '<div class="note info"><i class="bi bi-shield-check"></i><span>Three features use an outside AI service: Certificate Scan, Description Improver, and Resume Suggestions.</span></div>' +
            '<div class="list-card mb-3">' +
            '<div class="row-item"><div class="row-lead"><i class="bi bi-cloud-arrow-up"></i></div><div class="row-main"><div class="row-title">What is sent</div><div class="row-sub">Only the certificate photo, your rough description, or the pasted job posting with entry titles.</div></div></div>' +
            '<div class="row-item"><div class="row-lead"><i class="bi bi-person-slash"></i></div><div class="row-main"><div class="row-title">What is never sent</div><div class="row-sub">Your name and contact details stay on this phone.</div></div></div></div>';
        if (p.next) {
            html += '<button id="n-ok" class="btn btn-navy w-100">I Understand</button>';
        }
        return html;
    },
    setup: function (el, p) {
        if (!p.next) return;
        el.querySelector("#n-ok").onclick = function () {
            data.aiAccepted = true;
            saveData();
            replace(p.next, p.nextParams);
        };
    }
};

screens.resumes = {
    title: "Resumes",
    tab: true,
    fab: {
        label: "Create resume",
        action: function () {
            go("createResume", { draft: { name: "", type: "OJT", template: "Classic", summary: "", entryIds: [] } });
        }
    },
    render: function () {
        if (data.resumes.length == 0) {
            return emptyMessage("bi-file-earmark-text", "No resumes yet. Tap the plus button to make your first one.");
        }
        var html = '<div class="list-card">';
        data.resumes.forEach(function (r) {
            html += '<div class="row-item" data-open="' + r.id + '"><div class="row-lead"><i class="bi bi-file-earmark-person"></i></div>' +
                '<div class="row-main"><div class="row-title">' + esc(r.name) + '</div><div class="row-sub">' + r.type + " · " + r.template + " · " + r.entryIds.length + (r.entryIds.length == 1 ? " entry" : " entries") + '</div></div>' +
                '<button class="icon-btn menu-btn" data-menu="' + r.id + '" aria-label="More options"><i class="bi bi-three-dots-vertical"></i></button></div>';
        });
        return html + "</div>";
    },
    setup: function (el) {
        el.querySelectorAll("[data-open]").forEach(function (row) {
            row.onclick = function (ev) {
                if (ev.target.closest("[data-menu]")) return;
                openResume(row.getAttribute("data-open"));
            };
        });
        el.querySelectorAll("[data-menu]").forEach(function (btn) {
            btn.onclick = function () {
                var id = btn.getAttribute("data-menu");
                chooser(findResume(id).name, [
                    { icon: "bi-eye", label: "Open", action: function () { openResume(id); } },
                    { icon: "bi-share", label: "Share", action: function () { toast("Sharing is not ready yet"); } },
                    { icon: "bi-pencil", label: "Rename", action: function () { renameResume(id); } },
                    { icon: "bi-trash", label: "Delete", action: function () { deleteResume(id); } }
                ]);
            };
        });
    }
};

function openResume(id) {
    go("preview", { draft: JSON.parse(JSON.stringify(findResume(id))) });
}

function renameResume(id) {
    var resume = findResume(id);
    var html = '<h3>Rename resume</h3><div class="field"><input id="rename" class="form-control" maxlength="40" value="' + esc(resume.name) + '"></div>' +
        '<div class="btn-row"><button id="rename-no" class="btn btn-line">Cancel</button><button id="rename-ok" class="btn btn-navy">Save</button></div>';
    openModal(html, function (root) {
        root.querySelector("#rename-no").onclick = closeModal;
        root.querySelector("#rename-ok").onclick = function () {
            var input = root.querySelector("#rename");
            if (!input.value.trim()) {
                input.classList.add("is-invalid");
                return;
            }
            resume.name = input.value.trim();
            saveData();
            closeModal();
            refresh();
        };
    });
}

function deleteResume(id) {
    confirmBox("Delete this resume?", "Your entries stay on the Timeline. Only this resume version is removed.", "Delete", function () {
        data.resumes = data.resumes.filter(function (r) { return r.id != id; });
        saveData();
        refresh();
    });
}

screens.createResume = {
    title: "Create Resume",
    render: function (p) {
        var d = p.draft;
        var segment = resumeTypes.map(function (t) {
            return '<button type="button" data-v="' + t + '" class="' + (d.type == t ? "on" : "") + '">' + t + "</button>";
        }).join("");
        var sorted = data.entries.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        var rows = '<div class="row-item muted">No entries yet. Add achievements on the Timeline first.</div>';
        if (sorted.length > 0) {
            rows = sorted.map(function (e) {
                var checked = d.entryIds.indexOf(e.id) > -1 ? " checked" : "";
                return '<label class="row-item"><input type="checkbox" class="check" data-e="' + e.id + '"' + checked + '><div class="row-main"><div class="row-title">' + esc(e.title) + "</div></div></label>";
            }).join("");
        }
        return '<div class="field"><label for="r-name">Version name <span class="req">*</span></label><input id="r-name" class="form-control" maxlength="40" placeholder="OJT Resume" value="' + esc(d.name) + '"><div class="error-text">Give this version a name.</div></div>' +
            '<div class="field"><span class="label">Application type</span><div class="seg" id="r-type">' + segment + "</div></div>" +
            '<div class="field"><label for="r-tpl">Template</label><select id="r-tpl" class="form-select">' + options(templates, d.template) + "</select></div>" +
            '<div class="field">' + aiButton("r-suggest", "Suggest from job posting", "btn-line w-100") + "</div>" +
            '<div class="field"><span class="label">Entries to include</span><div class="list-card">' + rows + '</div><div class="error-text" id="r-error">Tick at least one entry.</div></div>' +
            '<button id="r-go" class="btn btn-navy w-100">Preview Resume</button>';
    },
    setup: function (el, p) {
        var d = p.draft;

        function readForm() {
            d.name = el.querySelector("#r-name").value;
            d.template = el.querySelector("#r-tpl").value;
            d.entryIds = [];
            el.querySelectorAll("[data-e]:checked").forEach(function (c) {
                d.entryIds.push(c.getAttribute("data-e"));
            });
        }

        setupSegment(el.querySelector("#r-type"), function (value) {
            d.type = value;
        });

        el.querySelectorAll("[data-e]").forEach(function (c) {
            c.onchange = function () {
                el.querySelector("#r-error").classList.remove("show");
            };
        });

        el.querySelector("#r-suggest").onclick = function () {
            readForm();
            useAI("jobPosting", { draft: d });
        };

        el.querySelector("#r-go").onclick = function () {
            readForm();
            var noName = !d.name.trim();
            var noEntries = d.entryIds.length == 0;
            el.querySelector("#r-name").classList.toggle("is-invalid", noName);
            el.querySelector("#r-error").classList.toggle("show", noEntries);
            if (noName || noEntries) return;
            d.name = d.name.trim();
            go("preview", { draft: d });
        };
    }
};

screens.jobPosting = {
    title: "Job Posting Suggestions",
    render: function (p) {
        var html = '<div class="field"><label for="j-text">Job or OJT posting</label><textarea id="j-text" class="form-control" rows="6" placeholder="Paste the posting here">' + esc(p.text || "") + "</textarea></div>";
        if (!p.results) {
            return html + aiButton("j-go", "Find matching entries", "btn-navy w-100");
        }
        var rows = p.results.map(function (r) {
            var checked = p.picks.indexOf(r.entry.id) > -1 ? " checked" : "";
            return '<label class="row-item"><input type="checkbox" class="check" data-p="' + r.entry.id + '"' + checked + '><div class="row-main"><div class="row-title">' + esc(r.entry.title) + '</div><div class="row-sub">' + r.entry.category + " · " + monthYear(r.entry.date) + "</div></div>" +
                (r.fits ? '<span class="fit-badge">Fits</span>' : "") + "</label>";
        }).join("");
        return html + '<div class="label">Suggested entries <span class="ai-tag">AI</span></div><div class="list-card mb-3">' + rows + "</div>" +
            '<div class="field"><label for="j-sum">Draft summary</label><textarea id="j-sum" class="form-control" rows="3">' + esc(p.summary) + "</textarea></div>" +
            '<div class="note"><i class="bi bi-exclamation-circle"></i><span>The AI can be wrong. Check the entries and summary before using them.</span></div>' +
            '<div class="btn-row"><button id="j-use" class="btn btn-navy wide">Use Suggestions</button><button id="j-redo" class="btn btn-line">Start over</button></div>';
    },
    setup: function (el, p) {
        if (el.querySelector("#j-go")) {
            el.querySelector("#j-go").onclick = function () {
                var text = el.querySelector("#j-text").value;
                if (text.trim().length < 20) {
                    toast("Paste a longer posting");
                    return;
                }
                var words = text.toLowerCase().match(/[a-z]{4,}/g) || [];
                p.text = text;
                p.results = data.entries.map(function (e) {
                    var content = (e.title + " " + e.category + " " + e.description).toLowerCase();
                    var score = 0;
                    words.forEach(function (w) {
                        if (content.indexOf(w) > -1) score++;
                    });
                    return { entry: e, score: score, fits: score > 0 };
                }).sort(function (a, b) { return b.score - a.score; });
                if (p.results.length > 0 && !p.results[0].fits) {
                    p.results.slice(0, 2).forEach(function (r) { r.fits = true; });
                }
                p.picks = p.results.filter(function (r) { return r.fits; }).map(function (r) { return r.entry.id; });
                p.summary = data.profile.year.replace(" Year", "") + "-year " + data.profile.program.replace(/^BS /, "") + " student with hands-on experience in " +
                    p.results.filter(function (r) { return r.fits; }).slice(0, 2).map(function (r) { return r.entry.category.toLowerCase(); }).join(" and ") + ".";
                refresh();
            };
        }
        if (el.querySelector("#j-use")) {
            el.querySelector("#j-use").onclick = function () {
                p.draft.entryIds = [];
                el.querySelectorAll("[data-p]:checked").forEach(function (c) {
                    p.draft.entryIds.push(c.getAttribute("data-p"));
                });
                p.draft.summary = el.querySelector("#j-sum").value.trim();
                back();
            };
            el.querySelector("#j-redo").onclick = function () {
                p.results = null;
                refresh();
            };
        }
    }
};

screens.preview = {
    title: "Resume Preview",
    render: function (p) {
        var d = p.draft;
        var profile = data.profile;
        var entries = d.entryIds.map(findEntry).filter(function (e) { return e; });
        entries.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        var contact = [profile.program, [profile.email, profile.phone].filter(Boolean).join(" · "), profile.address].filter(Boolean).map(esc).join("<br>");

        var summary = '<div class="summary">' + esc(d.summary) + "</div>";
        if (p.editing) {
            summary = '<textarea id="p-sum" class="form-control" rows="3">' + esc(d.summary) + "</textarea>";
        }
        var html = '<div class="paper tpl-' + d.template.toLowerCase() + '"><div class="name">' + esc(profile.name) + '</div><div class="contact">' + contact + "</div><hr>" +
            "<h4>Summary</h4>" + summary + "<h4>Achievements</h4>";
        entries.forEach(function (e) {
            html += '<div class="item"><div class="top"><span>' + esc(e.title) + "</span><span>" + monthYear(e.date) + "</span></div>" +
                (e.description ? "<p>" + esc(e.description) + "</p>" : "") + "</div>";
        });
        html += "</div>";
        return html + '<div class="btn-row"><button id="p-edit" class="btn btn-line">' + (p.editing ? "Done" : "Edit") + '</button><button id="p-save" class="btn btn-navy">Save</button><button id="p-pdf" class="btn btn-outline-navy">PDF</button></div>';
    },
    setup: function (el, p) {
        var d = p.draft;

        function readSummary() {
            var box = el.querySelector("#p-sum");
            if (box) d.summary = box.value.trim();
        }

        el.querySelector("#p-edit").onclick = function () {
            readSummary();
            p.editing = !p.editing;
            refresh();
        };

        el.querySelector("#p-save").onclick = function () {
            readSummary();
            if (d.id) {
                data.resumes = data.resumes.map(function (r) { return r.id == d.id ? d : r; });
            } else {
                d.id = newId();
                data.resumes.unshift(d);
            }
            saveData();
            goTab("resumes");
        };

        el.querySelector("#p-pdf").onclick = function () {
            readSummary();
            makePdf(d);
        };
    }
};

screens.certificates = {
    title: "Certificates",
    tab: true,
    render: function () {
        if (data.entries.length == 0) {
            return emptyMessage("bi-award", "Your certificates will show up here once you add entries with proof.");
        }
        var sorted = data.entries.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        var html = '<div class="list-card">';
        sorted.forEach(function (e) {
            var hasProof = e.proofs.length > 0;
            html += '<label class="row-item' + (hasProof ? "" : " greyed") + '"><input type="checkbox" class="check" data-c="' + e.id + '"' + (hasProof ? "" : " disabled") + '>' +
                '<div class="row-main"><div class="row-title">' + esc(e.title) + '</div><div class="row-sub">' + e.category + " · " + monthYear(e.date) + "</div></div>" +
                (hasProof ? '<span class="proof-count"><i class="bi bi-paperclip"></i>' + e.proofs.length + "</span>" : '<span class="small muted">No proof</span>') + "</label>";
        });
        return html + '</div><div class="sticky-actions"><button id="c-export" class="btn btn-navy w-100" disabled><i class="bi bi-box-arrow-up"></i>Export</button></div>';
    },
    setup: function (el) {
        var button = el.querySelector("#c-export");
        if (!button) return;
        el.querySelectorAll("[data-c]").forEach(function (c) {
            c.onchange = function () {
                button.disabled = el.querySelectorAll("[data-c]:checked").length == 0;
            };
        });
        button.onclick = function () {
            toast("Certificate export is not ready yet");
        };
    }
};

screens.settings = {
    title: "Settings",
    tab: true,
    render: function () {
        var rows = [
            ["profile", "bi-person", "Profile", "Name, program, and contact details"],
            ["reminders", "bi-bell", "Reminders", "Semester end dates"],
            ["backup", "bi-hdd", "Backup and Restore", "Save or restore everything"],
            ["aiNotice", "bi-stars", "AI Notice", "What is sent to the AI service"]
        ];
        var html = '<div class="list-card">';
        rows.forEach(function (r) {
            html += '<button class="row-item" data-go="' + r[0] + '"><div class="menu-ico"><i class="bi ' + r[1] + '"></i></div>' +
                '<div class="row-main"><div class="row-title">' + r[2] + '</div><div class="row-sub">' + r[3] + '</div></div><i class="bi bi-chevron-right chev"></i></button>';
        });
        return html + "</div>";
    },
    setup: function (el) {
        el.querySelectorAll("[data-go]").forEach(function (row) {
            row.onclick = function () {
                go(row.getAttribute("data-go"), {});
            };
        });
    }
};

screens.profile = {
    title: "Profile",
    render: function () {
        var p = data.profile;
        return '<div class="field"><label for="p-name">Full name</label><input id="p-name" class="form-control" value="' + esc(p.name) + '"><div class="error-text">Enter your name.</div></div>' +
            '<div class="field"><label for="p-prog">Program</label><input id="p-prog" class="form-control" value="' + esc(p.program) + '"></div>' +
            '<div class="field"><label for="p-year">Year level</label><select id="p-year" class="form-select">' + options(yearLevels, p.year, "Select year level") + "</select></div>" +
            '<div class="field"><label for="p-mail">Email</label><input id="p-mail" type="email" class="form-control" value="' + esc(p.email) + '"><div class="error-text">Enter a valid email.</div></div>' +
            '<div class="field"><label for="p-tel">Phone number</label><input id="p-tel" type="tel" class="form-control" value="' + esc(p.phone) + '"></div>' +
            '<div class="field"><label for="p-addr">Address</label><input id="p-addr" class="form-control" value="' + esc(p.address) + '"></div>' +
            '<button id="p-save" class="btn btn-navy w-100">Save</button>';
    },
    setup: function (el) {
        el.querySelector("#p-save").onclick = function () {
            var name = el.querySelector("#p-name");
            var mail = el.querySelector("#p-mail");
            var badMail = mail.value.trim() != "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim());
            name.classList.toggle("is-invalid", !name.value.trim());
            mail.classList.toggle("is-invalid", badMail);
            if (!name.value.trim() || badMail) return;
            data.profile.name = name.value.trim();
            data.profile.program = el.querySelector("#p-prog").value.trim();
            data.profile.year = el.querySelector("#p-year").value;
            data.profile.email = mail.value.trim();
            data.profile.phone = el.querySelector("#p-tel").value.trim();
            data.profile.address = el.querySelector("#p-addr").value.trim();
            saveData();
            back();
        };
    }
};

screens.reminders = {
    title: "Reminders",
    render: function () {
        var html = "";
        if (data.reminders.length == 0) {
            html += emptyMessage("bi-bell-slash", "No semesters set yet.");
        } else {
            html += '<div class="list-card">';
            data.reminders.forEach(function (r) {
                html += '<div class="row-item reminder-row"><div class="row-main"><div class="row-title">' + r.semester + '</div><div class="row-sub mb-2">' + r.schoolYear + "</div>" +
                    '<input type="date" class="form-control" data-date="' + r.id + '" value="' + r.end + '"></div>' +
                    '<input type="checkbox" class="toggle" data-on="' + r.id + '"' + (r.on ? " checked" : "") + "></div>";
            });
            html += "</div>";
        }
        return html + '<button id="rm-add" class="btn btn-line w-100 mt-3"><i class="bi bi-plus-lg"></i>Add semester</button>';
    },
    setup: function (el) {
        function find(id) {
            return data.reminders.filter(function (r) { return r.id == id; })[0];
        }
        el.querySelectorAll("[data-date]").forEach(function (input) {
            input.onchange = function () {
                find(input.getAttribute("data-date")).end = input.value;
                saveData();
            };
        });
        el.querySelectorAll("[data-on]").forEach(function (input) {
            input.onchange = function () {
                find(input.getAttribute("data-on")).on = input.checked;
                saveData();
            };
        });
        el.querySelector("#rm-add").onclick = function () {
            var html = "<h3>Add semester</h3>" +
                '<div class="field"><label for="a-year">School year</label><select id="a-year" class="form-select">' + options(schoolYearOptions()) + "</select></div>" +
                '<div class="field"><label for="a-sem">Semester</label><select id="a-sem" class="form-select">' + options(semesters) + "</select></div>" +
                '<div class="field"><label for="a-end">End date</label><input id="a-end" type="date" class="form-control"><div class="error-text">Pick the end date.</div></div>' +
                '<div class="btn-row"><button id="a-no" class="btn btn-line">Cancel</button><button id="a-ok" class="btn btn-navy">Add</button></div>';
            openModal(html, function (root) {
                root.querySelector("#a-no").onclick = closeModal;
                root.querySelector("#a-ok").onclick = function () {
                    var end = root.querySelector("#a-end");
                    if (!end.value) {
                        end.classList.add("is-invalid");
                        return;
                    }
                    data.reminders.push({
                        id: newId(),
                        schoolYear: root.querySelector("#a-year").value,
                        semester: root.querySelector("#a-sem").value,
                        end: end.value,
                        on: true
                    });
                    saveData();
                    closeModal();
                    refresh();
                };
            });
        };
    }
};

screens.backup = {
    title: "Backup and Restore",
    render: function () {
        return '<div class="note info"><i class="bi bi-info-circle"></i><span>There is no cloud backup. If the phone is lost or the app is uninstalled, data is gone unless you saved a backup file.</span></div>' +
            '<button id="b-make" class="btn btn-navy w-100 mb-2"><i class="bi bi-download"></i>Create Backup</button>' +
            '<button id="b-restore" class="btn btn-line w-100"><i class="bi bi-upload"></i>Restore from file</button>';
    },
    setup: function (el) {
        el.querySelector("#b-make").onclick = function () {
            toast("Backup is not ready yet");
        };
        el.querySelector("#b-restore").onclick = function () {
            var input = document.createElement("input");
            input.type = "file";
            input.onchange = function () {
                if (!input.files[0]) return;
                confirmBox("Restore this backup?", "This replaces the data currently on this phone.", "Restore", function () {
                    toast("Restore is not ready yet");
                });
            };
            input.click();
        };
    }
};
