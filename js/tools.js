(function()
{
  const definitions = [
  {
    type: "function",
    function:
    {
      name: "open_application",
      description: "Open a built-in Little Hollow application. For pre-filling content, prefer the dedicated tools (open_notepad, open_calculator, open_paint) — but path/text/equation/strokes/select are also accepted here and forwarded to the app.",
      parameters:
      {
        type: "object",
        properties:
        {
          name:
          {
            type: "string",
            enum: [
              "Apps",
              "File Manager",
              "Clock",
              "Calculator",
              "Notepad",
              "Paint",
              "tictactoe",
              "snake",
              "imageViewer",
              "videoPlayer",
              "audioPlayer",
              "Messenger",
              "Settings"
            ]
          },
          src:
          {
            type: "string"
          },
          path:
          {
            type: "string"
          },
          text:
          {
            type: "string"
          },
          equation:
          {
            type: "string"
          },
          strokes:
          {
            type: "array",
            items:
            {
              type: "object"
            }
          },
          select:
          {
            type: "boolean"
          }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "open_notepad",
      description: "Open Notepad. You can supply a virtual file path to load, initial text to show, or both.",
      parameters:
      {
        type: "object",
        properties:
        {
          path:
          {
            type: "string"
          },
          text:
          {
            type: "string"
          },
          title:
          {
            type: "string"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "open_paint",
      description: "Open Paint with an optional generated painting. A painting is an array of strokes; each stroke can contain color, size and points as [{x,y}]. Coordinates use a 0..1 normalized canvas.",
      parameters:
      {
        type: "object",
        properties:
        {
          strokes:
          {
            type: "array",
            items:
            {
              type: "object"
            }
          },
          title:
          {
            type: "string"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "open_calculator",
      description: "Open Calculator with an equation already entered and evaluated. It shows both the equation and answer.",
      parameters:
      {
        type: "object",
        properties:
        {
          equation:
          {
            type: "string"
          }
        },
        required: ["equation"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "open_file",
      description: "Open a virtual file by path using the most suitable app. Text/code opens in Notepad, images/videos/audio use their player/viewer, and archives can be viewed in File Manager.",
      parameters:
      {
        type: "object",
        properties:
        {
          path:
          {
            type: "string"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "open_file_manager",
      description: "Open File Manager. In select mode it can be used as a file selector for another app.",
      parameters:
      {
        type: "object",
        properties:
        {
          select:
          {
            type: "boolean"
          },
          path:
          {
            type: "string"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "open_window",
      description: "Open a window showing text, code, HTML, generated content, results, or other structured output.",
      parameters:
      {
        type: "object",
        properties:
        {
          title:
          {
            type: "string"
          },
          content_type:
          {
            type: "string",
            enum: ["text", "code",
              "html"
            ]
          },
          content:
          {
            type: "string"
          }
        },
        required: [
          "content_type",
          "content"
        ]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "open_iframe",
      description: "Open an iframe window for a URL, including embeddable web pages or YouTube embeds when permitted.",
      parameters:
      {
        type: "object",
        properties:
        {
          title:
          {
            type: "string"
          },
          url:
          {
            type: "string"
          },
          width:
          {
            type: "integer",
            minimum: 240
          },
          height:
          {
            type: "integer",
            minimum: 180
          }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "web_search",
      description: "Search the public web for external information and return indexed results.",
      parameters:
      {
        type: "object",
        properties:
        {
          query:
          {
            type: "string"
          },
          max_results:
          {
            type: "integer",
            minimum: 1,
            maximum: 10
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "write_file",
      description: "Create or overwrite one virtual filesystem file. Paths can use chxd:/local/, chxd:/session/, chxd:/indexdb/ and puter:/ only when Puter filesystem support is actually available.",
      parameters:
      {
        type: "object",
        properties:
        {
          path:
          {
            type: "string"
          },
          content:
          {
            type: "string"
          },
          create:
          {
            type: "boolean"
          }
        },
        required: [
          "path",
          "content"
        ]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "write_files",
      description: "Create or overwrite multiple virtual filesystem files in one operation.",
      parameters:
      {
        type: "object",
        properties:
        {
          files:
          {
            type: "array",
            items:
            {
              type: "object",
              properties:
              {
                path:
                {
                  type: "string"
                },
                content:
                {
                  type: "string"
                },
                create:
                {
                  type: "boolean"
                }
              },
              required: [
                "path",
                "content"
              ]
            }
          }
        },
        required: ["files"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "read_file",
      description: "Read a virtual filesystem file and open it in a viewer window.",
      parameters:
      {
        type: "object",
        properties:
        {
          path:
          {
            type: "string"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "remove_file",
      description: "Delete a virtual filesystem file.",
      parameters:
      {
        type: "object",
        properties:
        {
          path:
          {
            type: "string"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "find_files",
      description: "Search for virtual files by wildcard pattern.",
      parameters:
      {
        type: "object",
        properties:
        {
          pattern:
          {
            type: "string"
          }
        },
        required: ["pattern"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "list_files",
      description: "List virtual files under a filesystem prefix.",
      parameters:
      {
        type: "object",
        properties:
        {
          prefix:
          {
            type: "string"
          }
        },
        required: ["prefix"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "zip_files",
      description: "Create a ZIP archive from multiple virtual files and save the ZIP as a virtual file.",
      parameters:
      {
        type: "object",
        properties:
        {
          files:
          {
            type: "array",
            items:
            {
              type: "string"
            }
          },
          output_path:
          {
            type: "string"
          }
        },
        required: [
          "files",
          "output_path"
        ]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "open_onecompiler",
      description: "Open OneCompiler with one language and one or multiple files. The files can be edited and run in the embedded editor.",
      parameters:
      {
        type: "object",
        properties:
        {
          language:
          {
            type: "string"
          },
          code:
          {
            type: "string"
          },
          name:
          {
            type: "string"
          },
          files:
          {
            type: "array",
            items:
            {
              type: "object"
            }
          },
          run:
          {
            type: "boolean"
          }
        },
        required: ["language"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "run_code",
      description: "Open OneCompiler using source from a virtual file path and optionally run it.",
      parameters:
      {
        type: "object",
        properties:
        {
          path:
          {
            type: "string"
          },
          language:
          {
            type: "string"
          },
          run:
          {
            type: "boolean"
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "execute_javascript",
      description: "Execute arbitrary JavaScript inside a sandboxed isolated frame. It has no DOM or network access and only the provided Little Hollow file APIs: await lh.readFile(path), await lh.writeFile(path,content), await lh.listFiles(prefix), await lh.removeFile(path), and console.log(...). The job is time limited. Use this for generating documents, data, many files, SVG/HTML/text, and other file-building tasks.",
      parameters:
      {
        type: "object",
        properties:
        {
          code:
          {
            type: "string"
          },
          timeout_ms:
          {
            type: "integer",
            minimum: 250,
            maximum: 10000
          }
        },
        required: ["code"]
      }
    }
  },
  {
    type: "function",
    function:
    {
      name: "close_all_windows",
      description: "Close all currently open windows.",
      parameters:
      {
        type: "object",
        properties:
        {}
      }
    }
  }];

  function formatValue(value)
  {
    if (value === undefined)
    {
      return "";
    }
    if (value === null)
    {
      return "null";
    }
    if (value instanceof Error)
    {
      return value.stack ||
        value.message ||
        String(value);
    }
    if (typeof value === "string")
    {
      return value;
    }
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint"
    )
    {
      return String(value);
    }
    try
    {
      return JSON.stringify(
        value,
        null,
        2
      );
    }
    catch (_)
    {
      return String(value);
    }
  }

  function resultMessage(result)
  {
    if (
      result &&
      typeof result === "object"
    )
    {
      if (
        typeof result.summary ===
        "string" &&
        result.summary.trim()
      )
      {
        return result.summary.trim();
      }
      if (
        typeof result.message ===
        "string" &&
        result.message.trim()
      )
      {
        return result.message.trim();
      }
      if (
        typeof result.error ===
        "string" &&
        result.error.trim()
      )
      {
        return result.error.trim();
      }
    }
    return formatValue(result);
  }
  const esc = s =>
    String(
      s == null ?
      "" :
      formatValue(s)
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  function commandLine(name, args)
  {
    const shown =
      Object.entries(
        args ||
        {}
      )
      .map(
        ([k, v]) =>
        k + "=" +
        (
          typeof v === "string" ?
          v :
          formatValue(v)
        )
      )
      .join(" ");
    return "> " +
      name +
      (
        shown ?
        " " + shown :
        ""
      );
  }

  function terminal(command)
  {
    const html =
      "<div class='lh-terminal' style='" +
      "width:100%;" +
      "height:100%;" +
      "margin:0;" +
      "padding:0;" +
      "background:#000;" +
      "color:#00FFFF;" +
      "font-family:monospace;" +
      "display:flex;" +
      "flex-direction:column;" +
      "overflow:hidden;" +
      "box-sizing:border-box;" +
      "'>" +
      "<div style='" +
      "height:30px;" +
      "min-height:30px;" +
      "padding:0 10px;" +
      "display:flex;" +
      "align-items:center;" +
      "gap:0;" +
      "border-bottom:1px solid #00FFFF;" +
      "background:#001414;" +
      "color:#00FFFF;" +
      "font-size:11px;" +
      "letter-spacing:1px;" +
      "box-sizing:border-box;" +
      "'>" +
      "<span style='opacity:.45;margin-right:6px'>●</span>" +
      "<span style='opacity:.65;margin-right:6px'>●</span>" +
      "<span style='opacity:.9;margin-right:12px'>●</span>" +
      "<span>LITTLE HOLLOW TERMINAL</span>" +
      "</div>" +
      "<div id='terminal-screen' style='" +
      "flex:1;" +
      "min-height:0;" +
      "overflow:auto;" +
      "padding:12px;" +
      "background:" +
      "radial-gradient(circle at top left,rgba(0,255,255,.06),transparent 40%)," +
      "#000;" +
      "color:#00FFFF;" +
      "font-family:monospace;" +
      "font-size:12px;" +
      "line-height:1.55;" +
      "white-space:pre-wrap;" +
      "word-break:break-word;" +
      "box-sizing:border-box;" +
      "'>" +
      "<div id='terminal-out'>" +
      "<div style='opacity:.75'>" +
      "LITTLE HOLLOW TERMINAL" +
      "</div>" +
      "<div style='opacity:.4'>" +
      "SYSTEM READY" +
      "</div>" +
      "<br>" +
      "<div>" +
      "<span style='color:#00FFFF'>" +
      "chxd@little-hollow" +
      "</span>" +
      "<span style='opacity:.45'>:</span>" +
      "<span style='color:#66FFFF'>~</span>" +
      "<span style='opacity:.45'>$</span> " +
      esc(command) +
      "</div>" +
      "<div style='margin-top:8px'>" +
      "<span style='color:#FFFF00'>" +
      "[ RUNNING ]" +
      "</span>" +
      "</div>" +
      "<span class='cursor'>█</span>" +
      "</div>" +
      "</div>" +
      "</div>";
    return WM.openWindow(
    {
      title: "TERMINAL",
      html,
      width: "560px",
      height: "320px",
      noPad: false,
      standaloneKey: null
    });
  }

  function terminalUpdate(
    win,
    command,
    result
  )
  {
    if (
      !win ||
      !win.el
    )
    {
      return;
    }
    const out =
      win.el.querySelector(
        "#terminal-out"
      );
    if (!out)
    {
      return;
    }
    const ok = !!(
      result &&
      typeof result === "object" &&
      result.ok === true
    );
    const message =
      resultMessage(
        result
      );
    const state =
      ok ?
      "[ OK ]" :
      "[ ERROR ]";
    const stateColor =
      ok ?
      "#00FF88" :
      "#FF6666";
    out.innerHTML =
      "<div style='opacity:.75'>" +
      "LITTLE HOLLOW TERMINAL" +
      "</div>" +
      "<div style='opacity:.4'>" +
      "TOOL EXECUTION" +
      "</div>" +
      "<br>" +
      "<div>" +
      "<span style='color:#00FFFF'>" +
      "chxd@little-hollow" +
      "</span>" +
      "<span style='opacity:.45'>:</span>" +
      "<span style='color:#66FFFF'>~</span>" +
      "<span style='opacity:.45'>$</span> " +
      esc(command) +
      "</div>" +
      "<div style='margin-top:8px;color:" +
      stateColor +
      "'>" +
      state +
      "</div>" +
      "<div style='margin-top:8px;opacity:.92'>" +
      esc(message) +
      "</div>" +
      "<br>" +
      "<div style='opacity:.4'>" +
      "PROCESS COMPLETE" +
      "</div>" +
      "<span class='cursor'>█</span>";
    const screen =
      win.el.querySelector(
        "#terminal-screen"
      );
    if (screen)
    {
      screen.scrollTop =
        screen.scrollHeight;
    }
  }
  console.log(
    "terminal/tools"
  );

  function closeTerminalSoon(
    win,
    delay = 2000
  )
  {
    setTimeout(
      () =>
      {
        if (
          win &&
          !win.closed
        )
        {
          WM.closeWindow(
            win
          );
        }
      },
      delay
    );
  }
  async function webSearch(
    query,
    maxResults
  )
  {
    query =
      String(
        query || ""
      )
      .trim();
    if (!query)
    {
      return {
        ok: false,
        summary: "Search query is empty."
      };
    }
    const limit =
      Math.max(
        1,
        Math.min(
          10,
          Number(
            maxResults
          ) || 5
        )
      );
    Avatar.setEye(
      "search",
      -1
    );
    try
    {
      const url =
        "https://api.duckduckgo.com/?q=" +
        encodeURIComponent(
          query
        ) +
        "&format=json&no_html=1&skip_disambig=0";
      const r =
        await fetch(
          url,
          {
            headers:
            {
              Accept: "application/json"
            }
          }
        );
      if (!r.ok)
      {
        throw new Error(
          "HTTP " +
          r.status
        );
      }
      const d =
        await r.json();
      const results = [];
      if (d.AbstractText)
      {
        results.push(
        {
          title: d.Heading ||
            query,
          snippet: d
            .AbstractText,
          url: d.AbstractURL ||
            ""
        });
      }
      const walk = a =>
      {
        for (
          const x of
            Array.isArray(a) ?
            a :
            []
        )
        {
          if (
            results.length >=
            limit
          )
          {
            break;
          }
          if (x.Topics)
          {
            walk(
              x.Topics
            );
          }
          else if (x.Text)
          {
            results.push(
            {
              title: String(
                  x.Text
                )
                .split(
                  " - "
                )[0]
                .slice(
                  0,
                  120
                ),
              snippet: x.Text,
              url: x
                .FirstURL ||
                ""
            });
          }
        }
      };
      walk(
        d.RelatedTopics
      );
      walk(
        d.Results
      );
      return {
        ok: true,
        summary: "Search completed for \"" +
          query +
          "\" with " +
          results.length +
          " result(s).",
        results,
        query
      };
    }
    catch (e)
    {
      return {
        ok: false,
        summary: "Web search failed: " +
          e.message,
        query
      };
    }
    finally
    {
      Avatar.setEye(
        "normal"
      );
    }
  }

  function utf8(s)
  {
    return new TextEncoder()
      .encode(
        String(s)
      );
  }

  function u16(n)
  {
    return [
      n & 255,
      (n >>> 8) & 255
    ];
  }

  function u32(n)
  {
    return [
      n & 255,
      (n >>> 8) & 255,
      (n >>> 16) & 255,
      (n >>> 24) & 255
    ];
  }

  function crc32(bytes)
  {
    let c =
      0xffffffff;
    for (
      const b of bytes
    )
    {
      c ^= b;
      for (
        let i = 0; i < 8; i++
      )
      {
        c =
          (c >>> 1) ^
          (
            (c & 1) ?
            0xedb88320 :
            0
          );
      }
    }
    return (
      c ^ 0xffffffff
    ) >>> 0;
  }

  function makeZip(entries)
  {
    const parts = [];
    const central = [];
    let offset = 0;
    for (
      const entry of
        entries
    )
    {
      const name =
        utf8(
          entry.name
          .replace(
            /^\/+/,
            ""
          )
        );
      const data =
        entry.data;
      const crc =
        crc32(
          data
        );
      const header =
        new Uint8Array([
          ...u32(
            0x04034b50
          ),
          ...u16(20),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u32(crc),
          ...u32(data.length),
          ...u32(data.length),
          ...u16(
            name.length
          ),
          ...u16(0),
          ...name,
          ...data
        ]);
      parts.push(
        header
      );
      central.push(
        new Uint8Array([
          ...u32(
            0x02014b50
          ),
          ...u16(20),
          ...u16(20),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u32(crc),
          ...u32(data.length),
          ...u32(data.length),
          ...u16(name.length),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u16(0),
          ...u32(0),
          ...u32(offset),
          ...name
        ])
      );
      offset +=
        header.length;
    }
    const cdStart =
      offset;
    const cdSize =
      central.reduce(
        (n, x) =>
        n + x.length,
        0
      );
    const eocd =
      new Uint8Array([
        ...u32(
          0x06054b50
        ),
        ...u16(0),
        ...u16(0),
        ...u16(
          central.length
        ),
        ...u16(
          central.length
        ),
        ...u32(cdSize),
        ...u32(cdStart),
        ...u16(0)
      ]);
    const all = [
      ...parts,
      ...central,
      eocd
    ];
    return new Blob(
      all,
      {
        type: "application/zip"
      }
    );
  }

  function blobDataURL(blob)
  {
    return new Promise(
      (res, rej) =>
      {
        const r =
          new FileReader();
        r.onload = () =>
        {
          res(
            r.result
          );
        };
        r.onerror = () =>
        {
          rej(
            r.error
          );
        };
        r.readAsDataURL(
          blob
        );
      }
    );
  }
  async function zipFiles(
    files,
    output
  )
  {
    const entries = [];
    for (
      const path of
        Array.isArray(files) ?
        files :
        []
    )
    {
      const p =
        FS.normalize(
          path
        );
      const r =
        await FS.read(
          p
        );
      if (!r.ok)
      {
        return {
          ok: false,
          summary: r.error
        };
      }
      let data;
      if (
        /^data:[^;]+;base64,/i
        .test(
          r.content
        )
      )
      {
        const b =
          atob(
            r.content
            .split(",")[1]
          );
        const a =
          new Uint8Array(
            b.length
          );
        for (
          let i = 0; i < b
          .length; i++
        )
        {
          a[i] =
            b.charCodeAt(i);
        }
        data = a;
      }
      else
      {
        data =
          utf8(
            r.content
          );
      }
      entries.push(
      {
        name: p.replace(
            /^.*?:\/(?:[^/]+\/)?/,
            ""
          ) ||
          p.split("/").pop(),
        data
      });
    }
    const blob =
      makeZip(
        entries
      );
    const dataUrl =
      await blobDataURL(
        blob
      );
    const dest =
      FS.normalize(
        output
      );
    const w =
      await FS.write(
        dest,
        dataUrl,
        true
      );
    if (!w.ok)
    {
      return {
        ok: false,
        summary: w.error
      };
    }
    return {
      ok: true,
      summary: "Created ZIP " +
        dest +
        " containing " +
        entries.length +
        " file(s).",
      path: dest,
      binary: true
    };
  }

  function sandboxRun(
    code,
    timeoutMs
  )
  {
    return new Promise(
      resolve =>
      {
        const id =
          "sb-" +
          Date.now() +
          "-" +
          Math.random()
          .toString(36)
          .slice(2);
        const logs = [];
        const frame =
          document.createElement(
            "iframe"
          );
        frame.setAttribute(
          "sandbox",
          "allow-scripts"
        );
        frame.style.cssText =
          "position:fixed;" +
          "left:-10000px;" +
          "top:-10000px;" +
          "width:1px;" +
          "height:1px;" +
          "border:0";
        const csp =
          "default-src 'none'; " +
          "script-src 'unsafe-inline'; " +
          "connect-src 'none'; " +
          "img-src data:; " +
          "style-src 'unsafe-inline'; " +
          "frame-src 'none'; " +
          "child-src 'none'; " +
          "form-action 'none'; " +
          "base-uri 'none'";
        const safeCode =
          String(
            code || ""
          )
          .replace(
            /<\/script/gi,
            "<\\/script"
          );
        frame.srcdoc =
          `<!doctype html>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<script>

const RID=${JSON.stringify(id)};

const pending=new Map();

let seq=0;

function call(api,args){

return new Promise(
(resolve,reject)=>{

const rid=
RID+
":"+
(++seq);

pending.set(
rid,
{
resolve,
reject
}
);

parent.postMessage(
{
type:
"LH_SANDBOX_REQ",
rid,
api,
args
},
"*"
);

}
);

}

window.addEventListener(
"message",
e=>{

const d=
e.data||
{};

if(
d.type===
"LH_SANDBOX_RES"&&
pending.has(
d.rid
)
){

const p=
pending.get(
d.rid
);

pending.delete(
d.rid
);

d.ok
?p.resolve(
d.value
)
:p.reject(
new Error(
d.error||
"operation failed"
)
);

}

}
);

const lh={

readFile:
p=>
call(
"readFile",
[p]
),

writeFile:
(p,c)=>
call(
"writeFile",
[p,c]
),

listFiles:
p=>
call(
"listFiles",
[p||""]
),

removeFile:
p=>
call(
"removeFile",
[p]
),

log:
(...a)=>
parent.postMessage(
{
type:
"LH_SANDBOX_LOG",
id:RID,
args:
a.map(
String
)
},
"*"
)

};

(async()=>{

try{

const result=
await(
async()=>{

${safeCode}

}
)();

parent.postMessage(
{
type:
"LH_SANDBOX_DONE",

id:RID,

ok:true,

result:
result==null
?""
:String(
result
)

},
"*"
);

}catch(e){

parent.postMessage(
{
type:
"LH_SANDBOX_DONE",

id:RID,

ok:false,

error:
e&&e.stack||
String(
e
)

},
"*"
);

}

})();

</script>`;
        document.body.appendChild(
          frame
        );
        let done = false;
        const finish =
          r =>
          {
            if (done)
            {
              return;
            }
            done = true;
            window
              .removeEventListener(
                "message",
                onMessage
              );
            frame.remove();
            resolve(r);
          };
        const onMessage =
          async e =>
          {
            const d =
              e.data ||
              {};
            if (
              d.id !== id &&
              d.rid !==
              undefined &&
              !String(
                d.rid
              )
              .startsWith(
                id + ":"
              )
            )
            {
              return;
            }
            if (
              d.type ===
              "LH_SANDBOX_LOG"
            )
            {
              logs.push(
                d.args.join(
                  " "
                )
              );
            }
            if (
              d.type ===
              "LH_SANDBOX_REQ" &&
              String(
                d.rid
              )
              .startsWith(
                id + ":"
              )
            )
            {
              try
              {
                let value;
                const a =
                  d.args || [];
                if (
                  d.api ===
                  "readFile"
                )
                {
                  const r =
                    await FS.read(
                      a[0]
                    );
                  if (!r.ok)
                  {
                    throw new Error(
                      r.error
                    );
                  }
                  value =
                    r.content;
                }
                else if (
                  d.api ===
                  "writeFile"
                )
                {
                  const r =
                    await FS
                    .write(
                      a[0],
                      a[1],
                      true
                    );
                  if (!r.ok)
                  {
                    throw new Error(
                      r.error
                    );
                  }
                  value = true;
                }
                else if (
                  d.api ===
                  "listFiles"
                )
                {
                  value =
                    await FS.list(
                      a[0]
                    );
                }
                else if (
                  d.api ===
                  "removeFile"
                )
                {
                  const r =
                    await FS
                    .remove(
                      a[0]
                    );
                  if (!r.ok)
                  {
                    throw new Error(
                      r.error
                    );
                  }
                  value = true;
                }
                else
                {
                  throw new Error(
                    "Unknown sandbox API: " +
                    d.api
                  );
                }
                e.source
                  .postMessage(
                    {
                      type: "LH_SANDBOX_RES",
                      rid: d.rid,
                      ok: true,
                      value
                    },
                    "*"
                  );
              }
              catch (err)
              {
                e.source
                  .postMessage(
                    {
                      type: "LH_SANDBOX_RES",
                      rid: d.rid,
                      ok: false,
                      error: String(
                        err
                        .message ||
                        err
                      )
                    },
                    "*"
                  );
              }
            }
            if (
              d.type ===
              "LH_SANDBOX_DONE"
            )
            {
              finish(
              {
                ok:
                  !!d.ok,
                summary: d
                  .ok ?
                  (
                    "Sandbox JavaScript finished." +
                    (
                      d
                      .result ?
                      " Result: " +
                      d
                      .result :
                      ""
                    )
                  ) :
                  (
                    "Sandbox JavaScript failed: " +
                    d.error
                  ),
                logs
              });
            }
          };
        window.addEventListener(
          "message",
          onMessage
        );
        setTimeout(
          () => finish(
          {
            ok: false,
            summary: "Sandbox JavaScript timed out after " +
              timeoutMs +
              " ms.",
            logs
          }),
          timeoutMs
        );
      });
  }
  async function executeRaw(
    name,
    args
  )
  {
    args =
      args ||
      {};
    if (
      name ===
      "open_application"
    )
    {
      const hasContent =
        args.path != null ||
        args.text != null ||
        args.equation != null ||
        (
          Array.isArray(
            args.strokes
          ) &&
          args.strokes.length > 0
        ) ||
        !!args.select;
      const result =
        Apps.openApp(
          args.name,
          {
            src: args.src,
            path: args.path,
            text: args.text,
            equation: args.equation,
            painting: Array.isArray(
                args.strokes
              ) ?
              args.strokes :
              undefined,
            selectMode:
              !!args.select,
            allowMultiple: hasContent
          }
        );
      return result && result.ok ?
        {
          ok: true,
          summary: "Opened " +
            args.name +
            "."
        } :
        {
          ok: false,
          summary: "Could not open " +
            args.name +
            "."
        };
    }
    if (
      name ===
      "open_notepad"
    )
    {
      const result =
        Apps.openApp(
          "Notepad",
          {
            path: args.path,
            text: args.text,
            title: args.title,
            allowMultiple:
              !!args.path ||
              args.text != null
          }
        );
      return result && result.ok ?
        {
          ok: true,
          summary: "Opened Notepad" +
            (
              args.path ?
              " with " +
              args.path :
              ""
            ) +
            "."
        } :
        {
          ok: false,
          summary: "Could not open Notepad."
        };
    }
    if (
      name ===
      "open_paint"
    )
    {
      const result =
        Apps.openApp(
          "Paint",
          {
            painting: Array.isArray(
                args.strokes
              ) ?
              args.strokes :
              [],
            title: args.title,
            allowMultiple: true
          }
        );
      return result && result.ok ?
        {
          ok: true,
          summary: "Opened Paint with the requested painting."
        } :
        {
          ok: false,
          summary: "Could not open Paint."
        };
    }
    if (
      name ===
      "open_calculator"
    )
    {
      const result =
        Apps.openApp(
          "Calculator",
          {
            equation: String(
              args.equation ||
              ""
            ),
            allowMultiple: true
          }
        );
      return result && result.ok ?
        {
          ok: true,
          summary: "Opened Calculator with equation " +
            args.equation +
            "."
        } :
        {
          ok: false,
          summary: "Could not open Calculator."
        };
    }
    if (
      name ===
      "open_file_manager"
    )
    {
      const result =
        Apps.openApp(
          "File Manager",
          {
            selectMode:
              !!args.select,
            path: args.path,
            allowMultiple:
              !!args.select
          }
        );
      return result && result.ok ?
        {
          ok: true,
          summary: "Opened File Manager."
        } :
        {
          ok: false,
          summary: "Could not open File Manager."
        };
    }
    if (
      name ===
      "open_file"
    )
    {
      const p =
        FS.normalize(
          args.path
        );
      const ext =
        (
          p.split("?")[0]
          .split(".")
          .pop() ||
          ""
        )
        .toLowerCase();
      if (
        ext ===
        "png" ||
        ext ===
        "jpg" ||
        ext ===
        "jpeg" ||
        ext ===
        "gif" ||
        ext ===
        "webp"
      )
      {
        const result =
          Apps.openApp(
            "imageViewer",
            {
              src: p,
              allowMultiple: true
            }
          );
        return result && result.ok ?
          {
            ok: true,
            summary: "Opened image " +
              p +
              "."
          } :
          {
            ok: false,
            summary: "Could not open image."
          };
      }
      if (
        ext ===
        "mp4" ||
        ext ===
        "webm" ||
        ext ===
        "mov"
      )
      {
        const result =
          Apps.openApp(
            "videoPlayer",
            {
              src: p,
              allowMultiple: true
            }
          );
        return result && result.ok ?
          {
            ok: true,
            summary: "Opened video " +
              p +
              "."
          } :
          {
            ok: false,
            summary: "Could not open video."
          };
      }
      if (
        ext ===
        "mp3" ||
        ext ===
        "wav" ||
        ext ===
        "ogg"
      )
      {
        const result =
          Apps.openApp(
            "audioPlayer",
            {
              src: p,
              allowMultiple: true
            }
          );
        return result && result.ok ?
          {
            ok: true,
            summary: "Opened audio " +
              p +
              "."
          } :
          {
            ok: false,
            summary: "Could not open audio."
          };
      }
      const result =
        Apps.openApp(
          "Notepad",
          {
            path: p,
            allowMultiple: true
          }
        );
      return result && result.ok ?
        {
          ok: true,
          summary: "Opened " +
            p +
            " in Notepad."
        } :
        {
          ok: false,
          summary: "Could not open " +
            p +
            "."
        };
    }
    if (
      name ===
      "open_window"
    )
    {
      const type =
        String(
          args.content_type ||
          "text"
        )
        .toLowerCase();
      const c =
        String(
          args.content ||
          ""
        );
      const html =
        type ===
        "html" ?
        c :
        (
          type ===
          "code" ?
          (
            "<pre style='white-space:pre-wrap;margin:0;font-family:monospace;font-size:12px;'>" +
            esc(c) +
            "</pre>"
          ) :
          (
            "<div style='white-space:pre-wrap;'>" +
            esc(c) +
            "</div>"
          )
        );
      WM.openWindow(
      {
        title: args.title ||
          "OUTPUT",
        html,
        width: "560px",
        height: "400px"
      });
      return {
        ok: true,
        summary: "Opened output window."
      };
    }
    if (
      name ===
      "open_iframe"
    )
    {
      const u =
        String(
          args.url ||
          ""
        );
      if (
        !/^https?:\/\//i.test(
          u
        )
      )
      {
        return {
          ok: false,
          summary: "URL must start with http:// or https://."
        };
      }
      WM.openWindow(
      {
        title: args.title ||
          "WEB",
        iframeSrc: u,
        width: (Number(
            args.width
          ) || 720) +
          "px",
        height: (Number(
            args.height
          ) || 520) +
          "px",
        noPad: true
      });
      return {
        ok: true,
        summary: "Opened web content."
      };
    }
    if (
      name ===
      "web_search"
    )
    {
      return await webSearch(
        args.query,
        args.max_results
      );
    }
    if (
      name ===
      "write_file"
    )
    {
      const p =
        FS.normalize(
          args.path
        );
      const r =
        await FS.write(
          p,
          args.content ||
          "",
          args.create !== false
        );
      return r.ok ?
        {
          ok: true,
          summary: "Wrote " +
            p +
            "."
        } :
        {
          ok: false,
          summary: r.error
        };
    }
    if (
      name ===
      "write_files"
    )
    {
      const fs =
        Array.isArray(
          args.files
        ) ?
        args.files :
        [];
      const done = [];
      for (
        const f of fs
      )
      {
        const p =
          FS.normalize(
            f.path
          );
        const r =
          await FS.write(
            p,
            f.content ||
            "",
            f.create !== false
          );
        if (!r.ok)
        {
          return {
            ok: false,
            summary: r.error,
            written: done
          };
        }
        done.push(
          p
        );
      }
      return {
        ok: true,
        summary: "Wrote " +
          done.length +
          " file(s): " +
          done.join(
            ", "
          ) +
          "."
      };
    }
    if (
      name ===
      "read_file"
    )
    {
      const p =
        FS.normalize(
          args.path
        );
      const r =
        await FS.read(
          p
        );
      if (!r.ok)
      {
        return {
          ok: false,
          summary: r.error
        };
      }
      WM.openWindow(
      {
        title: p.split("/")
          .pop(),
        html: "<pre style='white-space:pre-wrap;margin:0;font-family:monospace;font-size:12px;'>" +
          esc(r.content) +
          "</pre>",
        width: "560px",
        height: "420px"
      });
      return {
        ok: true,
        summary: "Opened " +
          p +
          "."
      };
    }
    if (
      name ===
      "remove_file"
    )
    {
      const p =
        FS.normalize(
          args.path
        );
      const r =
        await FS.remove(
          p
        );
      return r.ok ?
        {
          ok: true,
          summary: "Removed " +
            p +
            "."
        } :
        {
          ok: false,
          summary: r.error
        };
    }
    if (
      name ===
      "find_files"
    )
    {
      const r =
        await FS.find(
          args.pattern ||
          "*"
        );
      return {
        ok: true,
        summary: r.length ?
          "Found " +
          r.length +
          " file(s)." :
          "No files matched.",
        files: r
      };
    }
    if (
      name ===
      "list_files"
    )
    {
      const r =
        await FS.list(
          args.prefix ||
          ""
        );
      return {
        ok: true,
        summary: r.length ?
          r.length +
          " file(s) found." :
          "No files found.",
        files: r
      };
    }
    if (
      name ===
      "zip_files"
    )
    {
      return await zipFiles(
        args.files,
        args.output_path
      );
    }
    if (
      name ===
      "open_onecompiler"
    )
    {
      const result =
        Apps.openOneCompiler(
        {
          language: args.language,
          code: args.code ||
            "",
          name: args.name,
          files: args.files,
          run:
            !!args.run
        });
      return result && result.ok ?
        {
          ok: true,
          summary: "Opened OneCompiler."
        } :
        {
          ok: false,
          summary: "Could not open OneCompiler."
        };
    }
    if (
      name ===
      "run_code"
    )
    {
      const p =
        FS.normalize(
          args.path
        );
      const r =
        await FS.read(
          p
        );
      if (!r.ok)
      {
        return {
          ok: false,
          summary: r.error
        };
      }
      const ext =
        p.split(".")
        .pop()
        .toLowerCase();
      const lang =
        args.language ||
        (
          {
            js: "javascript",
            javascript: "javascript",
            py: "python",
            python: "python",
            java: "java",
            c: "c",
            cpp: "cpp",
            cs: "csharp",
            php: "php",
            ts: "typescript",
            html: "html",
            css: "css"
          } [ext] ||
          "javascript"
        );
      const result =
        Apps.openOneCompiler(
        {
          language: lang,
          files: [
          {
            name: p.split("/")
              .pop(),
            content: r.content
          }],
          run: args.run !== false
        });
      return result && result.ok ?
        {
          ok: true,
          summary: "Opened " +
            p +
            " in OneCompiler."
        } :
        {
          ok: false,
          summary: "Could not open OneCompiler."
        };
    }
    if (
      name ===
      "execute_javascript"
    )
    {
      return await sandboxRun(
        args.code ||
        "",
        Math.max(
          250,
          Math.min(
            10000,
            Number(
              args.timeout_ms
            ) ||
            5000
          )
        )
      );
    }
    if (
      name ===
      "close_all_windows"
    )
    {
      WM.closeAll();
      return {
        ok: true,
        summary: "Closed all windows."
      };
    }
    return {
      ok: false,
      summary: "Unknown tool: " +
        name
    };
  }
  async function execute(
    name,
    args
  )
  {
    Avatar.setEye(
      name ===
      "web_search" ?
      "search" :
      "matrix",
      -1
    );
    const command =
      commandLine(
        name,
        args
      );
    let win = null;
    try
    {
      win =
        terminal(
          command
        );
      if (!win)
      {
        throw new Error(
          "Could not create terminal window."
        );
      }
      const result =
        await executeRaw(
          name,
          args
        );
      terminalUpdate(
        win,
        command,
        result
      );
      if (
        result &&
        result.ok
      )
      {
        closeTerminalSoon(
          win,
          850
        );
      }
      else
      {
        closeTerminalSoon(
          win,
          1400
        );
      }
      return result;
    }
    catch (e)
    {
      const r = {
        ok: false,
        summary: "Tool error: " +
          (
            e.message ||
            String(e)
          )
      };
      if (win)
      {
        terminalUpdate(
          win,
          command,
          r
        );
        closeTerminalSoon(
          win,
          1600
        );
      }
      return r;
    }
    finally
    {
      if (
        name !== "web_search"
      )
      {
        Avatar.setEye(
          "normal"
        );
      }
    }
  }
  window.Tools = {
    definitions,
    execute
  };
})();
