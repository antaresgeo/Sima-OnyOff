/*
Copyright 2012 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eric Bidelman (ericbidelman@chromium.org)
Updated: Joe Marini (joemarini@google.com)
*/

var chosenEntry = null;

function init_app(callback) {
    chrome.storage.local.get('sima_code', function (items) {
        if (items.sima_code) {
            loadFromFile(items.sima_code, function (r) {
                callback(r);
            });
        } else {
            confirmar(function (v) {
                loadFromFile(v, function (r) {
                    chrome.storage.local.set({
                        'sima_code': v
                    });
                    callback(r);
                });
            });

        }
    });

}

function restart_app(callback) {
    confirmar(function (v) {
        console.info("restarting...");
        chrome.storage.local.set({
            'sima_code': v,
            'chosenFile': null
        });
        init_app(function (r) {
            callback(r);
        });
    });
}

function confirmar(callback) {
    var dialog = document.querySelector("#confirmar");
    var cb = dialog.querySelector('[dialog-confirm]');
    var text = dialog.querySelector('paper-input');
    cb.addEventListener('click', function () {
        callback(text.value);
    });
    dialog.open();
}

function getData(codigo, callback) {
    console.info('request');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://190.27.248.60:8088/sima-pruebas/get-json.php?codigo=' + codigo, true);
    //xhr.responseType = 'blob';
    xhr.onload = function (e) {
        callback(e, this);
    };
    xhr.send();
}

function loadFromFile(codigo, callback) {
    chrome.storage.local.get('chosenFile', function (items) {
        if (items.chosenFile) {
            // if an entry was retained earlier, see if it can be restored
            chrome.fileSystem.isRestorable(items.chosenFile, function (bIsRestorable) {
                // the entry is still there, load the content
                console.info("Restoring " + items.chosenFile);
                chrome.fileSystem.restoreEntry(items.chosenFile, function (chosenEntry) {
                    if (chosenEntry && chosenEntry.isFile) {
                        loadFileEntry(chosenEntry, function (r) {
                            callback(r);
                        });
                    }
                });
            });
        } else {
            var config = {
                type: 'saveFile',
            };
            chrome.fileSystem.chooseEntry(config, function (writableEntry) {
                getData(codigo, function (e, self) {
                    writeJson(writableEntry, self);
                    callback(self.response);
                });
            });
        }
    });
}

function download_json() {
    chrome.storage.local.get('chosenFile', function (items) {
        if (items.chosenFile) {
            chrome.fileSystem.isRestorable(items.chosenFile, function (bIsRestorable) {
                var config = {
                    type: 'saveFile',
                };
                chrome.fileSystem.chooseEntry(config, function (writableEntry) {
                    getData(codigo, function (e, self) {
                        writeJson(writableEntry, self);
                    });
                });
            });
        }
    });
}

function writeJson(writableEntry, self) {
    chrome.storage.local.set({
        'chosenFile': chrome.fileSystem.retainEntry(writableEntry)
    });
    var blob = new Blob([self.response], {
        type: 'text/plain'
    });
    console.log('write');
    writeFileEntry(writableEntry, blob, function (e) {
        noti('Sincronizado :D');
    });
}


function errorHandler(e) {
    console.error(e);
}

function readAsText(fileEntry, callback) {
    fileEntry.file(function (file) {
        var reader = new FileReader();

        reader.onerror = errorHandler;
        reader.onload = function (e) {
            callback(e.target.result);
        };

        reader.readAsText(file);
    });
}

function writeFileEntry(writableEntry, opt_blob, callback) {
    if (!writableEntry) {
        noti('Archivo no seleccionado');
        return;
    }

    writableEntry.createWriter(function (writer) {

        writer.onerror = errorHandler;
        writer.onwriteend = function (e) {
            callback(e);
        };

        // If we have data, write it to the file. Otherwise, just use the file we
        // loaded.
        if (opt_blob) {
            writer.truncate(opt_blob.size);
            waitForIO(writer, function () {
                writer.seek(0);
                writer.write(opt_blob);
            });
        } else {
            chosenEntry.file(function (file) {
                writer.truncate(file.fileSize);
                waitForIO(writer, function () {
                    writer.seek(0);
                    writer.write(file);
                });
            });
        }
    }, errorHandler);
}

function waitForIO(writer, callback) {
    // set a watchdog to avoid eventual locking:
    var start = Date.now();
    // wait for a few seconds
    var reentrant = function () {
        if (writer.readyState === writer.WRITING && Date.now() - start < 4000) {
            setTimeout(reentrant, 100);
            return;
        }
        if (writer.readyState === writer.WRITING) {
            noti("Write operation taking too long, aborting!" +
                " (current writer readyState is " + writer.readyState + ")");
            writer.abort();
        } else {
            callback();
        }
    };
    setTimeout(reentrant, 100);
}

// for files, read the text content into the window.simaUserUDC
function loadFileEntry(_chosenEntry, callback) {
    chosenEntry = _chosenEntry;
    chosenEntry.file(function (file) {
        readAsText(chosenEntry, function (result) {
            window.simaUserUDC = JSON.parse(result);
            callback(result);
        });
    });
}

function noti(text) {
    var noti = document.querySelector('#toast');
    noti.text = text;
    noti.show();
}

function sima(context) {
    context.innerHTML = "<app-sima></app-sima>";
    noti('Bienvenido');
}

WebFontConfig = {
    google: {
        families: ['Roboto::latin']
    }
};

(function () {
    var wf = document.createElement('script');
    wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
        '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
    wf.type = 'text/javascript';
    wf.async = 'true';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
})();

(function () {
    var reset = document.querySelector('#reset');
    var content = document.querySelector('#content');
    reset.addEventListener('click', function () {
        restart_app(function (r) {
            sima(content);
        });
    });
    init_app(function (r) {
        sima(content);
    });
})(document);