# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: master/surface/audit-drawer.master.spec.ts >> Audit drawer >> close button dismisses the drawer
- Location: tests/e2e/master/surface/audit-drawer.master.spec.ts:53:3

# Error details

```
Error: page.waitForFunction: TypeError: Cannot read properties of undefined (reading 'loaded')
    at eval (eval at predicate (eval at evaluate (:302:30)), <anonymous>:1:18)
    at predicate (eval at evaluate (:302:30), <anonymous>:7:27)
    at next (eval at evaluate (:302:30), <anonymous>:29:33)
    at eval (eval at evaluate (:302:30), <anonymous>:42:13)
    at UtilityScript.evaluate (<anonymous>:304:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```

# Page snapshot

```yaml
- paragraph [ref=e3]: Not Found
```