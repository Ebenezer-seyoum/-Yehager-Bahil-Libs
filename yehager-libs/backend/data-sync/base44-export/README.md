Place Base44 export JSON files here for staged sync.

Expected filenames:

- `User.json`
- `Product.json`
- `Event.json`
- `EventParticipant.json`
- `Measurement.json`
- `FamilyGroup.json`
- `FamilyMember.json`
- `CartItem.json`
- `Order.json`
- `ExchangeRate.json`
- `AuditLog.json`
- `SystemAlert.json`

Each file should be either:

1. a JSON array (`[{...}, {...}]`), or
2. an object with a `data` array (`{ "data": [{...}] }`).

Run:

- Dry run: `npm run sync:dry`
- Import run: `npm run sync:run`
