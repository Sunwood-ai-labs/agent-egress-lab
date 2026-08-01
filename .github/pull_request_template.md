## Summary

Describe the security assumption or operator behavior this change affects.

## Validation

- [ ] `./verify.ps1`
- [ ] `./verify-offline-e2e.ps1`
- [ ] `python -m unittest discover -s tests -v`
- [ ] `npm run docs:build` from `docs/` when documentation changed

## Safety and documentation

- [ ] No credentials, private hosts, customer data, or unpatched exploit details are included.
- [ ] Residual risk is documented.
- [ ] English and Japanese operator docs are synchronized when behavior changed.
