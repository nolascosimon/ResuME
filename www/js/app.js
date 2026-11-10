var stack = [];
var toastTimer;

function go(name, params) {
    stack.push({ name: name, params: params || {} });
    show();
}

function replace(name, params) {
    stack[stack.length - 1] = { name: name, params: params || {} };
    show();
}

function back() {
    if (stack.length > 1) {
        stack.pop();
        show();
    }
}

function goTab(name) {
    stack = [{ name: name, params: {} }];
    show();
}

function refresh() {
    var top = document.getElementById("screen").scrollTop;
    show();
    document.getElementById("screen").scrollTop = top;
}

function show() {
    var current = stack[stack.length - 1];
    var screen = screens[current.name];
    var title = typeof screen.title == "function" ? screen.title(current.params) : screen.title;

    document.getElementById("title").textContent = title;
    document.getElementById("topbar").hidden = screen.noBar == true;
    document.getElementById("back-btn").hidden = screen.tab == true;
    document.getElementById("tabbar").hidden = screen.tab != true;
    document.querySelectorAll("#tabbar a").forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("data-tab") == current.name);
    });

    var el = document.getElementById("screen");
    el.innerHTML = screen.render(current.params);
    el.scrollTop = 0;

    var oldFab = document.getElementById("fab");
    if (oldFab) oldFab.remove();
    if (screen.fab) {
        var fab = document.createElement("button");
        fab.id = "fab";
        fab.className = "fab";
        fab.setAttribute("aria-label", screen.fab.label);
        fab.innerHTML = '<i class="bi bi-plus-lg"></i>';
        fab.onclick = screen.fab.action;
        document.getElementById("app").appendChild(fab);
    }

    if (screen.setup) screen.setup(el, current.params);
    updateAIButtons();
}

function isOnline() {
    if (navigator.connection && window.Connection) {
        return navigator.connection.type != Connection.NONE;
    }
    return navigator.onLine;
}

function updateAIButtons() {
    var online = isOnline();
    document.querySelectorAll("[data-ai]").forEach(function (b) {
        b.disabled = !online;
    });
}

function aiButton(id, label, classes) {
    return '<button type="button" id="' + id + '" class="btn ' + classes + '" data-ai="1">' + label + '<span class="ai-tag">AI</span></button>';
}

function toast(message) {
    var el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        el.classList.remove("show");
    }, 2200);
}

function openModal(html, setup) {
    var root = document.getElementById("modal");
    root.innerHTML = '<div class="scrim"><div class="dialog">' + html + "</div></div>";
    root.firstChild.onclick = function (ev) {
        if (ev.target == root.firstChild) closeModal();
    };
    if (setup) setup(root);
}

function closeModal() {
    document.getElementById("modal").innerHTML = "";
}

function confirmBox(title, message, okText, onOk) {
    var html = "<h3>" + title + "</h3><p>" + message + "</p>" +
        '<div class="btn-row"><button id="no" class="btn btn-line">Cancel</button>' +
        '<button id="yes" class="btn btn-danger-line">' + okText + "</button></div>";
    openModal(html, function (root) {
        root.querySelector("#no").onclick = closeModal;
        root.querySelector("#yes").onclick = function () {
            closeModal();
            onOk();
        };
    });
}

function chooser(title, choices) {
    var html = "<h3>" + esc(title) + "</h3>";
    choices.forEach(function (c, i) {
        html += '<button class="opt" data-i="' + i + '"><i class="bi ' + c.icon + '"></i><span>' + c.label + "</span></button>";
    });
    openModal(html, function (root) {
        root.querySelectorAll(".opt").forEach(function (b) {
            b.onclick = function () {
                closeModal();
                choices[b.getAttribute("data-i")].action();
            };
        });
    });
}

function setupChips(box, onPick) {
    box.querySelectorAll(".chip").forEach(function (chip) {
        chip.onclick = function () {
            box.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("on"); });
            chip.classList.add("on");
            onPick(chip.getAttribute("data-v"));
        };
    });
}

function setupSegment(box, onPick) {
    box.querySelectorAll("button").forEach(function (btn) {
        btn.onclick = function () {
            box.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
            btn.classList.add("on");
            onPick(btn.getAttribute("data-v"));
        };
    });
}

function pickPhoto(fromCamera, done) {
    if (navigator.camera && window.Camera) {
        var failed = function () {
            toast("The camera could not take a photo");
        };
        navigator.camera.getPicture(function (uri) {
            resolveLocalFileSystemURL(uri, function (entry) {
                entry.file(function (file) {
                    var reader = new FileReader();
                    reader.onload = function () {
                        done(reader.result, "photo-" + Date.now() + ".jpg");
                    };
                    reader.onerror = failed;
                    reader.readAsDataURL(file);
                }, failed);
            }, failed);
        }, function (message) {
            if (!/no image|cancel|selected/i.test(String(message))) failed();
        }, {
            quality: 60,
            targetWidth: 800,
            targetHeight: 800,
            destinationType: Camera.DestinationType.FILE_URI,
            sourceType: fromCamera ? Camera.PictureSourceType.CAMERA : Camera.PictureSourceType.PHOTOLIBRARY,
            correctOrientation: true
        });
        return;
    }
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = function () {
        var file = input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            done(reader.result, file.name);
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function pickFile(done) {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = function () {
        if (input.files[0]) done(input.files[0]);
    };
    input.click();
}

function dataUrlToBlob(url) {
    var parts = url.split(",");
    var type = parts[0].match(/:(.*?);/)[1];
    var raw = atob(parts[1]);
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
    }
    return new Blob([bytes], { type: type });
}

function storeProof(blob, name, done) {
    if (!window.cordova || !window.resolveLocalFileSystemURL) {
        var reader = new FileReader();
        reader.onload = function () {
            done(reader.result);
        };
        reader.readAsDataURL(blob);
        return;
    }

    function failed() {
        toast("The file could not be saved");
    }

    var fileName = Date.now() + "-" + name.replace(/[^\w.\-]/g, "_");
    resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dir) {
        dir.getFile(fileName, { create: true }, function (file) {
            file.createWriter(function (writer) {
                writer.onwriteend = function () {
                    done(file.nativeURL);
                };
                writer.onerror = failed;
                writer.write(blob);
            }, failed);
        }, failed);
    }, failed);
}

function proofType(name) {
    return /\.pdf$/i.test(name) ? "pdf" : "image";
}

function useAI(name, params) {
    if (data.aiAccepted) {
        go(name, params);
    } else {
        go("aiNotice", { next: name, nextParams: params });
    }
}

document.addEventListener("input", function (ev) {
    ev.target.classList.remove("is-invalid");
});

document.addEventListener("change", function (ev) {
    ev.target.classList.remove("is-invalid");
});

document.getElementById("back-btn").onclick = back;

document.querySelectorAll("#tabbar a").forEach(function (a) {
    a.onclick = function () {
        goTab(a.getAttribute("data-tab"));
    };
});

window.addEventListener("online", refresh);
window.addEventListener("offline", refresh);

document.addEventListener("deviceready", function () {
    if (window.StatusBar) {
        StatusBar.overlaysWebView(false);
        StatusBar.backgroundColorByHexString("#1a3a8f");
        StatusBar.styleLightContent();
    }
    document.addEventListener("backbutton", function () {
        if (document.querySelector("#modal .scrim")) {
            closeModal();
        } else if (stack.length > 1) {
            back();
        } else {
            navigator.app.exitApp();
        }
    }, false);
}, false);

function startApp() {
    loadData(function () {
        goTab(data.welcomed ? "timeline" : "welcome");
    });
}

if (window.cordova) {
    document.addEventListener("deviceready", startApp, false);
} else {
    startApp();
}
