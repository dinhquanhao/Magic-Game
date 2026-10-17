import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// cmd.exe can misread UTF-8 batch files with LF-only lines. Guard the actual
// distributed bytes so codeload ZIPs and checkouts keep the Windows fix.
const bytes=readFileSync(new URL('../START.bat',import.meta.url));
assert.ok([...bytes].every(byte=>byte<128),'Launcher must be ASCII without a BOM');
const script=bytes.toString('ascii');
assert.ok(script.endsWith('\r\n'),'Launcher must end with CRLF');
assert.ok(!script.replaceAll('\r\n','').includes('\n'),'Bare LF can break cmd.exe parsing');
assert.ok(!script.replaceAll('\r\n','').includes('\r'),'Unexpected bare CR');
assert.match(script,/cd \/d "%~dp0"/,'Resolve quoted project path, not caller directory');
assert.match(script,/call npm\.cmd ci\r\n/,'Call the Windows npm shim and keep control in the launcher');
assert.match(script,/call npm\.cmd run dev -- --host 127\.0\.0\.1 --open\r\n/,'Vite owns opening the actual selected port');
assert.ok(!/powershell|ExecutionPolicy|chcp/i.test(script),'Launcher must not depend on a shell or code page change');
const attributes=readFileSync(new URL('../.gitattributes',import.meta.url),'utf8');
assert.match(attributes,/^\*\.bat -text$/m,'Git must preserve the distributed CRLF bytes');
