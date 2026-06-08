# Request for George — emit `IdentityCreated { id, owner }`

## Problem
`IIdentity` is a **shared** object and there's no event tying it to its creator, so
the frontend can't answer "show me *my* iWallets" from the chain. Today we track
created ids in the browser's localStorage (per-device) + an import-by-id field. That
breaks cross-device: a user who creates an iWallet on their laptop can't see it on
their phone, and an iWallet provisioned via the agent CLI doesn't show in the UI until
manually imported.

## Ask
In `create_iidentity`, emit an event with the new object id and the owner:

```move
public struct IdentityCreated has copy, drop {
    identity_id: address,
    owner: address,
}

// inside create_iidentity, after sharing:
event::emit(IdentityCreated {
    identity_id: identity.id.uid_to_address(),
    owner: ctx.sender(),
});
```

## Why this shape
The frontend then does one `queryEvents({ MoveEventType: ...::IdentityCreated })`,
filters `owner == connectedAddress`, and lists every iWallet that wallet owns — no
localStorage, works on any device, and picks up CLI-provisioned identities automatically.

`AgentExecutionEvent` / `PolicyUpdatedEvent` already exist; this is the missing
creation event. Small, additive, no struct-layout change.
