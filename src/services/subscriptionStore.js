// src/services/subscriptionStore.js
// In-memory subscription store (replace with persistent storage e.g., DynamoDB later)

const subscriptions = [];

function serialize(sub) {
    // stable representation for comparison
    return JSON.stringify({
        endpoint: sub.endpoint,
        keys: sub.keys,
        userId: sub.userId
    });
}

function add(subscription) {
    if (!subscription || !subscription.endpoint) return false;
    const exists = subscriptions.some(s => serialize(s) === serialize(subscription));
    if (!exists) {
        subscriptions.push({ ...subscription, addedAt: new Date().toISOString() });
        return true;
    }
    return false;
}

function remove(subscription) {
    if (!subscription) return false;
    const idx = subscriptions.findIndex(s => serialize(s) === serialize(subscription));
    if (idx !== -1) {
        subscriptions.splice(idx, 1);
        return true;
    }
    return false;
}

function all() { return subscriptions; }

function byUser(userId) {
    return subscriptions.filter(s => s.userId === userId);
}

module.exports = { add, remove, all, byUser };
