const {
    getSkill,
    createSkill: createSkillInDb,
    updateSkill: updateSkillInDb,
    logSkillUsage
} = require('./db').crud;
const vm = require('vm');

/**
 * Creates a new skill.
 * @param {string} name - The name of the skill.
 * @param {string} description - A short description of the skill.
 * @param {string} type - The type of skill ('javascript' or 'mcp').
 * @param {string} code - The JavaScript code for the skill.
 * @param {object} config - The configuration for an MCP skill.
 * @returns {Promise<object>} The created skill.
 */
async function createSkill(name, description, type = 'javascript', code, config) {
    if (!name || !type) {
        return {
            error: 'Skill name and type are required.'
        };
    }

    try {
        const newSkill = await createSkillInDb(name, description, type, code, config);
        return newSkill;
    } catch (error) {
        return {
            error: `Failed to create skill: ${error.message}`
        };
    }
}

/**
 * Updates an existing skill.
 * @param {number} id - The ID of the skill to update.
 * @param {object} updates - The fields to update.
 * @returns {Promise<object>} The updated skill.
 */
async function updateSkill(id, updates) {
    if (!id || !updates) {
        return {
            error: 'Skill ID and updates are required.'
        };
    }

    try {
        const updatedSkill = await updateSkillInDb(id, updates);
        return updatedSkill;
    } catch (error) {
        return {
            error: `Failed to update skill: ${error.message}`
        };
    }
}

/**
 * Executes a skill by its ID.
 * @param {number} skillId - The ID of the skill to execute.
 * @param {any} input - The input to pass to the skill.
 * @param {number} conversationId - The ID of the current conversation.
 * @param {number} messageId - The ID of the user's message.
 * @returns {Promise<object>} The result of the skill's execution.
 */
async function executeSkillById(skillId, input, conversationId, messageId) {
    const startTime = Date.now();
    try {
        const skill = await getSkill(skillId);
        if (!skill) {
            throw new Error('Skill not found.');
        }

        if (skill.type === 'javascript') {
            const sandbox = {
                input,
                console: {
                    log: (...args) => args.join(' '),
                },
                // We can add more context/helpers here
            };
            const context = vm.createContext(sandbox);
            const script = new vm.Script(skill.code);

            const result = await script.runInContext(context, {
                timeout: 5000
            }); // 5s timeout

            const executionTimeMs = Date.now() - startTime;
            await logSkillUsage(skillId, conversationId, messageId, true, executionTimeMs);

            return {
                success: true,
                result
            };
        } else if (skill.type === 'mcp') {
            // For now, we don't support mcp skills here. This will be handled by mcp.js
            throw new Error('MCP skills are not executable through this function.');
        } else {
            throw new Error(`Unsupported skill type: ${skill.type}`);
        }
    } catch (error) {
        const executionTimeMs = Date.now() - startTime;
        await logSkillUsage(skillId, conversationId, messageId, false, executionTimeMs);
        return {
            success: false,
            error: error.message
        };
    }
}


module.exports = {
    createSkill,
    updateSkill,
    executeSkillById,
};