# Little Hollow

A cyan cyber-robot desktop environment, created for CHXD. Talk to "Little Hollow"
through the Messenger window and it can open apps, write/read files in a virtual
filesystem, and animate its avatar face.

## Run it

Any static file server works (this can't run from `file://` because of module
script + fetch/iframe restrictions in most browsers):

```
cd littlehollow
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

On first AI message, [Puter.js](https://puter.com) will pop up a small sign-in
window — that's Puter's "user-pays" model: no API key needed from you, the
visitor authorizes their own free Puter account to cover their own AI usage.

## Layout

```
index.html          desktop shell: avatar canvas, launcher icon, taskbar
style.css            all styling (cyan/monospace theme)
js/
  systemPrompt.js    the instructions given to the AI (identity + emote convention)
  filesystem.js       virtual FS: chxd:/local /session /indexdb /system
  avatar.js            canvas face renderer (eyes, mouth, hands, blink, typing)
  avatarText.js         strips/executes inline emote tags (<blinkR, 100> etc.) from AI text
  windowManager.js       draggable/resizable/minimizable windows + taskbar
  apps.js                  app registry -> opens app/*.html in windows
  tools.js                  real function-calling tool definitions + executor (apps, windows, files)
  ai.js                      talks to puter.ai.chat() with { tools }, runs the tool-call loop
  main.js                     boot: wires the launcher icon + taskbar
app/
  messenger.html    the chat UI (opened by the top-left icon)
  apps.html          app launcher grid
  calculator.html
  notepad.html        reads/writes the virtual filesystem
  paint.html
  clock.html
  tictactoe.html
  snake.html
  filemanager.html   browses all 4 filesystem zones
  imageviewer.html
  videoplayer.html
  audioplayer.html
```

## Notes

- Apps run in same-origin iframes and reach the shell via `parent.FS`,
  `parent.Apps`, `parent.WM`, `parent.Avatar`.
- **Commands are real tool calls, not parsed text.** `js/tools.js` defines
  OpenAI-style function schemas (`open_application`, `open_window`,
  `close_all_windows`, `read_file`, `write_file`, `remove_file`, `find_files`,
  `list_files`) and passes them to `puter.ai.chat(history, { tools })`.
  `js/ai.js` runs the tool-call loop: when the model returns `tool_calls`,
  each one is executed against real app/window/filesystem code, the result is
  sent back as a `role: "tool"` message, and the loop continues until the
  model produces a final plain-text reply.
- **Avatar emotes are the one exception** — blinking and waving stay as
  small inline text tags (`<blinkR, 100>`, `<wave, 400>`) inside the model's
  normal reply, stripped and executed by `js/avatarText.js`. They're
  cosmetic flourishes on the message itself rather than actions with real
  side effects, so a tool call would be overkill.
- `chxd:/system/` files are enforced read-only by `filesystem.js` itself
  (in code, not just by the prompt), regardless of what the AI is told or
  asked to claim.
- To change the AI model, edit `MODEL` at the top of `js/ai.js`.
