# account

- From `account.signUpTerms`: `{privacyPolicy}` and `{termsOfService}` are links whose words are `account.privacyPolicy` and `account.termsOfService`, already translated. They read as words of the sentence's own language, so space them as those words, not as Latin text.
- From `account.actionDenied`: `actionDenied` and `actionFailed` follow every account action (signing in, signing out, deleting the account), so they name no single action; each keeps its next step.
- From `account.lastAdmin`: Shown when the person tries to delete their account while they are the only admin of a team. Say that situation directly; the remedy is to make another member an admin or delete the team.
- From `account.mfaRequired`: The `mfa` keys and `account.ssoRequired` explain why a sign-in in the browser stopped. Two-step verification is a code from an authenticator app; use one term for it across all three `mfa` keys.
- From `account.cancelDelete`: The button that backs out of deleting the account, beside the delete button.
