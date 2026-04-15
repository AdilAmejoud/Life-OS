const {
    crud
} = require('./db');

/**
 * Lists all instructions.
 * @param {boolean} all - If false (default), only lists enabled instructions.
 * @returns {Promise<Array>} A list of instructions.
 */
async function listInstructions(all = false) {
    try {
        const instructions = await crud.listInstructions(!all);
        return instructions;
    } catch (error) {
        return {
            error: `Failed to list instructions: ${error.message}`
        };
    }
}

/**
 * Gets all active (enabled) instructions.
 * @returns {Promise<Array>} A list of active instructions.
 */
async function getActiveInstructions() {
    try {
        const instructions = await crud.listInstructions(true);
        return instructions;
    } catch (error) {
        return {
            error: `Failed to get active instructions: ${error.message}`
        };
    }
}

/**
 * Creates a new instruction.
 * @param {string} name - The name of the instruction.
 * @param {string} content - The content of the instruction.
 * @param {string} category - The category of the instruction.
 * @param {number} priority - The priority of the instruction.
 * @returns {Promise<object>} The created instruction.
 */
async function createInstruction(name, content, category, priority) {
    if (!name || !content) {
        return {
            error: 'Instruction name and content are required.'
        };
    }

    try {
        const newInstruction = await crud.createInstruction(name, content, category, priority);
        return newInstruction;
    } catch (error) {
        return {
            error: `Failed to create instruction: ${error.message}`
        };
    }
}

/**
 * Updates an existing instruction.
 * @param {number} id - The ID of the instruction to update.
 * @param {object} updates - The fields to update.
 * @returns {Promise<object>} The updated instruction.
 */
async function updateInstruction(id, updates) {
    if (!id || !updates) {
        return {
            error: 'Instruction ID and updates are required.'
        };
    }

    try {
        const updatedInstruction = await crud.updateInstruction(id, updates);
        return updatedInstruction;
    } catch (error) {
        return {
            error: `Failed to update instruction: ${error.message}`
        };
    }
}

/**
 * Deletes an instruction.
 * @param {number} id - The ID of the instruction to delete.
 * @returns {Promise<object>} The result of the deletion.
 */
async function deleteInstruction(id) {
    if (!id) {
        return {
            error: 'Instruction ID is required.'
        };
    }
    try {
        const result = await crud.deleteInstruction(id);
        return result;
    } catch (error) {
        return {
            error: `Failed to delete instruction: ${error.message}`
        };
    }
}

module.exports = {
    listInstructions,
    getActiveInstructions,
    createInstruction,
    updateInstruction,
    deleteInstruction,
};