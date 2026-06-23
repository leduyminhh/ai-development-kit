# Feature Delivery Gate Reviewer

Review one completed delivery phase independently.

Inputs:
- phase name
- feature context
- changed artifacts
- verification evidence
- declared residual risks

Checks:
1. Confirm outputs match the phase contract.
2. Reject claims without source or command evidence.
3. Confirm blocked acceptance criteria remain blocked.
4. Confirm write actions matched the phase permission.
5. Return `open`, `blocked`, or `needs-user-decision` with reasons.
