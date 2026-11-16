// Semester end-date reminders, using cordova-plugin-local-notification.
// One notification per semester that is switched on, shown at 9:00 AM on the
// end date. In a plain browser the plugin is missing, so everything here does nothing.

var REMINDER_HOUR = 9;

function notifPlugin() {
    if (window.cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) {
        return cordova.plugins.notification.local;
    }
    return null;
}

// The plugin needs a whole number for the notification id, but reminder ids are text.
// The same reminder id always gives the same number.
function notifId(reminderId) {
    var text = String(reminderId);
    var hash = 7;
    for (var i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) % 2147483000;
    }
    return hash + 1;
}

function reminderTime(r) {
    if (!r.end) return null;
    var when = toDate(r.end);
    if (isNaN(when.getTime())) return null;
    when.setHours(REMINDER_HOUR, 0, 0, 0);
    return when;
}

function reminderNotification(r) {
    return {
        id: notifId(r.id),
        title: "Semester ending",
        text: r.semester + ", " + r.schoolYear + " ends today. Add your achievements and proof to ResuME.",
        trigger: { at: reminderTime(r) },
        androidAllowWhileIdle: true
    };
}

function canNotify(r) {
    var when = reminderTime(r);
    return r.on && when && when.getTime() > Date.now();
}

// Schedule (or reschedule) one reminder. The plugin asks for the notification
// permission if it has not been asked yet. If it is refused, a short message tells the person.
function scheduleReminder(r) {
    var local = notifPlugin();
    if (!local) return;
    local.cancel(notifId(r.id), function () {
        if (!canNotify(r)) return;
        local.schedule(reminderNotification(r), function (granted) {
            if (granted === false) toast("Notifications are blocked. Turn them on in the phone settings.");
        });
    });
}

function cancelReminder(r) {
    var local = notifPlugin();
    if (!local) return;
    local.cancel(notifId(r.id));
}

// Runs every time the app opens: clear everything, then schedule all the switched-on semesters again.
function syncReminders() {
    var local = notifPlugin();
    if (!local) return;
    local.cancelAll(function () {
        var list = data.reminders.filter(canNotify).map(reminderNotification);
        if (list.length > 0) local.schedule(list);
    });
}
