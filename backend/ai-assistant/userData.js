const {
    crud
} = require('./db');

/**
 * Lists all user data, optionally filtered by category.
 * @param {string} category - The category to filter by.
 * @returns {Promise<Array>} A list of user data items.
 */
async function listUserData(category) {
    try {
        const data = await crud.listUserData(category);
        return data;
    } catch (error) {
        return {
            error: `Failed to list user data: ${error.message}`
        };
    }
}

/**
 * Stores a piece of user data.
 * @param {object} data - The data to store.
 * @param {string} data.category - The category of the data.
 * @param {string} data.key - The key of the data.
 * @param {string} data.value - The value of the data.
 * @param {number} data.confidence - The confidence score.
 * @returns {Promise<object>} The stored data item.
 */
async function storeUserData({
    category,
    key,
    value,
    confidence
}) {
    if (!category || !key || !value) {
        return {
            error: 'Category, key, and value are required.'
        };
    }

    try {
        const storedData = await crud.createOrUpdateUserData(category, key, value, confidence);
        return storedData;
    } catch (error) {
        return {
            error: `Failed to store user data: ${error.message}`
        };
    }
}

/**
 * Deletes a user data item.
 * @param {string} category - The category of the data item.
 * @param {string} key - The key of the data item.
 * @returns {Promise<object>} The result of the deletion.
 */
async function deleteUserDataItem(category, key) {
    if (!category || !key) {
        return {
            error: 'Category and key are required.'
        };
    }

    try {
        const result = await crud.deleteUserData(category, key);
        return result;
    } catch (error) {
        return {
            error: `Failed to delete user data item: ${error.message}`
        };
    }
}

module.exports = {
    listUserData,
    storeUserData,
    deleteUserDataItem,
};