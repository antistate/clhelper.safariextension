var options;
options = JSON.parse(localStorage.options);

function saveOptions() {
    var a = new Object();
    a.smartMode = options.smartMode;
    $("input:checkbox").each(function () {
        a[this.name] = this.checked
    });
    $("input:text").each(function () {
        a[this.name] = this.value
    });
    a.emailProvider = $("input[name=email]:checked").val() || "unset";
    localStorage.options = JSON.stringify(a);
    if (typeof safari !== "undefined") {
        safari.self.tab.dispatchMessage("ziinkcl", {
            op: "optionsUpdated"
        })
    }
    $("#saveMsg").text("Options Saved");
    window.setTimeout(function () {
        jQuery("#saveMsg").text("")
    }, 2000)
}
$(document).ready(function () {
    var a = 0;
    $("label").each(function () {
        if ($(this).width() > a) {
            a = $(this).width()
        }
    });
    $("label").width(a);
    for (var b in options) {
        if (typeof options[b] === "boolean") {
            $("input#" + b).attr("checked", options[b])
        } else {
            $("input#" + b).val(options[b])
        }
    }
    $('input:radio[value="' + options.emailProvider + '"]').attr("checked", true);
    jQuery.validator.addMethod("hex", function (d, c) {
        return this.optional(c) || /^[0-9A-F]+$/i.test(d)
    }, "Hexadecimal value only");
    jQuery.validator.addMethod("greaterThan", function (d, c, f) {
        var e = $(f).unbind(".validate-greaterThan").bind("blur.validate-greaterThan", function () {
            $(c).valid()
        });
        return d > e.val()
    }, "Maximum value should be greater than the minimum value specified.");
    $("#optionsForm").validate({
        rules: {
            hideNotificationTime: {
                required: true,
                number: true
            },
            showAdTextChars: {
                required: true,
                number: true
            },
            tnMaxWidth: {
                required: true,
                number: true,
                range: [50, 300]
            },
            tnMaxHeight: {
                required: true,
                number: true,
                range: [50, 250]
            },
            tnMax: {
                required: true,
                number: true
            },
            imgMinWidth: {
                required: true,
                number: true,
                range: [200, 500]
            },
            imgMinHeight: {
                required: true,
                number: true,
                range: [200, 500]
            },
            imgMaxWidth: {
                required: true,
                number: true,
                range: [300, 800],
                greaterThan: "#imgMinWidth"
            },
            imgMaxHeight: {
                required: true,
                number: true,
                range: [300, 800],
                greaterThan: "#imgMinHeight"
            },
            adWidth: {
                required: true,
                number: true,
                range: [300, 1280]
            },
            mapWidth: {
                required: true,
                number: true,
                range: [250, 700]
            },
            mapHeight: {
                required: true,
                number: true,
                range: [250, 700]
            },
            highlightColor: {
                required: true,
                hex: true
            },
            notesBgColor: {
                required: true,
                hex: true
            },
            bodyWidth: {
                required: true,
                range: [600, 1920]
            }
        }
    })
});