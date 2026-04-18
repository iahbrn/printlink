# Security Specification - PrintLink

## Data Invariants
1. A **User** profile must match their authenticated UID.
2. A **Shop** can only be created or modified by an Admin.
3. An **Order** must reference a valid `userId` (the creator) and a `shopId`.
4. Only the creator of an Order or an Admin can read the order details.
5. Only an Admin can update order status (except for cancellation by the user).
6. Users can only cancel their own orders if they are still 'pending'.

## The "Dirty Dozen" Payloads (Denial Tests)

1. **Identity Spoofing (User Profile):** Create a user profile with a different UID than the authenticated user.
2. **Privilege Escalation (User Profile):** Create/Update own user profile and set `role: "admin"`.
3. **Unauthorized Shop Creation:** Non-admin trying to create a Shop.
4. **Unauthorized Shop Modification:** Non-admin trying to update shop prices.
5. **Orphaned Order Creation:** Creating an order with a `userId` that doesn't match the auth UID.
6. **Relational Poisoning (Order):** Creating an order for a `shopId` that doesn't exist.
7. **Order Snooping:** Reading an order belonging to another user.
8. **Unauthorized Status Update:** User trying to set order status to 'ready'.
9. **Illegal Cancellation:** User trying to cancel an order that is already 'completed'.
10. **State Skipping:** Changing order status from 'pending' directly to 'completed' as a user.
11. **Huge ID Injection:** Using a 1MB string as a Document ID for a new order.
12. **PII Leak:** A user trying to list all user profiles (which contain emails).

## Test Runner Plan
I will use `@firebase/rules-unit-testing` or similar if available, but for now I will focus on the logic in `firestore.rules`.
