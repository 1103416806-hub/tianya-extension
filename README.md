# 填呀 · 校招简历助手

一个本地优先的 Chrome / Edge 浏览器插件：维护一份可复用简历，在企业网申页面识别字段，逐项确认后填写。

![填呀简历侧栏](docs/screenshots/resume-panel.png)

## 产品特点

- 一份结构化简历，覆盖基本信息、教育、工作、实习、项目、作品、获奖、语言和社交账号。
- 识别当前网页表单，展示“网页字段 ← 简历字段”的对应关系，用户确认后才写入。
- 保留网页已有内容，不处理身份证、验证码、协议勾选、附件上传和最终提交。
- PDF / DOCX / TXT 本地文字提取；复杂简历可选配用户自己的兼容模型服务。
- 内置虚构资料与安全练习页，无需真实网申账号即可演示完整流程。

界面只保留 `01 我的简历` 与 `02 填当前页` 两个核心入口，默认打开简历编辑器。

## 快速试用

1. 安装 Node.js 22+，运行 `npm ci`。
2. 运行 `npm run build`。
3. 打开 `edge://extensions` 或 `chrome://extensions`，开启开发者模式。
4. 选择“加载已解压的扩展”，加载构建生成的 `tianya-extension` 文件夹。
5. 打开侧栏中的“安全练习”，载入虚构示例，然后在“填当前页”完成识别与填写。

## Build

Node 22+ and npm. `npm ci`, then `npm run build`.

The build writes the unpacked extension to `../../outputs/tianya-extension`. Load that directory through your browser's developer-mode extension screen. No cloud deployment or backend is required. All scripts and PDF resources are bundled locally.

The build's Node-backed esbuild resolver avoids native ancestor-directory enumeration in the desktop Windows filesystem sandbox. The shipped runtime is regular browser JavaScript; esbuild and Node are not required to use it.

## Architecture

- `src/panel.jsx`: React side panel, local profile, imports, practice entry, field mapping, confirmation, optional AI request with explicit origin permission and consent.
- `src/core.js`: profile schema, conservative parser and label matcher, value checks.
- `src/agent.js`: isolated-world field scan, native setters/events, readback, cancellation, conditional undo. Also loaded directly by the internal practice page.
- `src/background.js`: toolbar user gesture opens side panel and records the authorized target; no permanent recruitment-site access.
- `src/import.js`: PDF.js text-only extraction, Mammoth raw DOCX extraction, TXT. No HTML from untrusted documents is rendered.
- `src/practice.jsx`: local synthetic React form with deliberately blocked/ambiguous fields.

No automatic login, save, submission, consent, upload, CAPTCHA solving, or blanket host access. Optional model origins are requested only after a user configures and invokes the AI parser. API keys are held in `chrome.storage.session`. Local resume data is not encrypted; export/import and clear controls are provided.

## Tests

- `npm test`: core deterministic structural tests.
- `node --test tests/core.test.mjs tests/pdf-compat.test.mjs tests/form-profile.test.mjs`: profile schema, parser, mapping and PDF compatibility fixtures.
- `node tests/navigation-privacy.mjs`: current two-view navigation, empty defaults, stored-profile persistence, explicit sample/practice actions and narrow/wide layouts.
- `node tests/ux.mjs`: import preview and settings-return interactions.
- `node tests/browser.mjs`: the unmodified delivered extension in an isolated Edge profile, end-to-end browser checks and screenshots.
- `node tests/form-browser.mjs`: structured resume editors and grouped mapping against a local form fixture.
- `node tests/web-integration.mjs`: local HTTP fixture and mock model service. A test-only extension copy adds localhost host permission; the release manifest is not changed.

Browser tests currently target the Windows Edge installation and use PDF/DOCX fixture generators from the configured Codex bundled Node runtime. Adapt the executable and fixture dependencies on other machines. Test profiles contain only synthetic information and are located in this source workspace. They are excluded from the source archive.

The fixture runtime is resolved from the current user's home directory, not a hardcoded developer path. Set `TIANYA_FIXTURE_MODULES` to a directory containing a `package.json` and installed `pdf-lib` / `docx` packages to use another fixture runtime.

Real model accuracy and authenticated enterprise form compatibility are not measured by these synthetic tests.

## 0.1.1 PDF compatibility regression

Both the panel and PDF worker use PDF.js's legacy build. `src/pdf-compat.js` adds `Promise.withResolvers` only if absent. The worker is an independent realm, so compatibility code is also prepended to its shipped file.

`node --test tests/pdf-compat.test.mjs` validates the Promise fallback. `node tests/pdf-compat.mjs` reproduces a browser with no native `toHex` in BOTH panel and worker, then checks real PDF extraction. Add `--missing-more-apis` to remove other typed-array codecs and `Promise.withResolvers` as well. `--expect-original-error` is for the old 0.1.0 output and was used to confirm the original error before fixing it. The compatibility tests use isolated, generated test copies only.

## 0.1.2 import and navigation

Imports automatically generate a local draft with evidence. Existing profiles are never overwritten until the user adopts the preview. Header-name heuristics are explicitly labeled for review. The new `evals` directory contains a 30-case synthetic baseline and candidate comparison (3 deterministic runs each), not a real-model or production accuracy claim. No AI prompt was changed.

The settings back button returns to its source view and restores scroll/input state. In 0.1.2, company recommendations used curated industry tags and reasons with name search retained. The historical checks covered import/navigation interactions, industry/search behavior and form-label aliases visible in the user-supplied screenshots. No application-tracking platform or Feishu integration was implemented; field analysis and solution brief are in outputs.

## 0.1.3 privacy and discovery controls

The resume source box starts empty and its placeholder contains instructions only. Synthetic data is loaded only by the explicit sample action. Existing browser-stored profiles are preserved. Regression fixtures use synthetic identities; historical evaluation values have been anonymized without rerunning the old parser or changing its scores.

In 0.1.3, company discovery showed at most three companies per batch, cycling after the last batch. Small industries explained why changing batches was unavailable. Typing filtered local matches; Enter or the top magnifier opened a web search in a new tab. The redundant bottom search button was removed. This used the same curated nine-company directory, not live recommendations. The discovery interface was later removed in 0.1.5.

Historical verification covered deterministic tests, import navigation, empty defaults, stored-profile persistence, batch cycling, search dispatch and 340/1280 px layouts. The discovery-specific browser suite was retired when that interface was removed in 0.1.5; use the current commands in the Tests section above. Browser tests use separate synthetic profiles, never your normal browser profile.

### Sharing on GitHub

Publish the curated source package, not the entire local workspace. Keep real resumes, exported resume JSON, API keys, `.env` files, browser profiles, personal screenshots and old archives out of the repository. `.gitignore` is a safeguard, not a sanitizer for already tracked files or Git history. This release does not upload anything or alter existing remote repositories. If personal data has already been published, removing it in a new commit alone does not erase prior history.

## 0.1.4 application field coverage and grouped mapping

The supplied field list is supported as structured data: desired city (distinct from current city), education, employment, internships, projects with URLs, portfolio links/descriptions, awards, languages and social accounts. Files, referral codes and declarations remain manual. Old `experience` records are retained as unclassified; the user explicitly moves each into employment or internships. Updating a profile invalidates the old fill plan.

`src/form-dom.js` reads associated container labels and nearby recognized headings, distinguishes explicit start/end placeholders, and blocks internal search inputs in custom selects. `src/MappingList.jsx` groups controls and allows the user to choose one source record for a detected page group. Record order is never inferred. `src/ResumeGroups.jsx` provides collapsible editors for all groups.

Before matching changes, `evals/run-form.mjs form-baseline-0.1.3` recorded 22/42 matching/abstention checks in each of three deterministic runs. Values are synthetic; labels came from the supplied list plus written boundary cases. This is not live DOM accuracy, a representative holdout, or a comparison with the employer's parser. The optional AI output schema and classification instructions were expanded; only the mock protocol was tested, not real-model extraction quality.

The 0.1.4 deterministic coverage included the profile and matching fixtures plus the then-current company discovery tests. `node tests/form-browser.mjs` checks grouped selection, writes, non-overwrite, migration and 340/1280 px layout against a written local form (not a Feishu page capture). Tests add loopback permissions only to a separate test copy; the released manifest remains activeTab-based. Use the current Tests section above for this version's commands.

The authenticated application was not accessible. Custom dropdown operation, date popups, automatic card creation, actual PDF extraction accuracy and a full end-to-end Feishu submission remain unverified or unsupported. Refresh the target webpage after reloading the extension, then reauthorize via its toolbar icon so the new content script is used; save your unfinished website draft yourself before refreshing.

## 0.1.5 focused navigation

The company recommendation view, industry filter, batch control and company search have been removed. The two remaining navigation entries are `01 我的简历` and `02 填当前页`, with the resume view shown initially. Below its heading, `载入示例` explicitly loads synthetic data, while `安全练习` opens the local practice page without loading any sample data. No favorites or application-tracking feature was added.

Users open their chosen recruitment website themselves, sign in and reach its editable form, then authorize the page through the extension toolbar icon. Saved browser profiles remain available across this update. This navigation change does not add parser or authenticated-site compatibility claims.
