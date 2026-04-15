import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';

const app = express();
app.use(cors());
app.use(express.json());

// خريطة الأوامر لكل أداة (تأكد أن هذه البرامج مثبتة في جهازك)
const COMMANDS = {
    terminal: 'gnome-terminal',
    vscode: 'code .',           // يفتح المجلد الحالي في VS Code
    neovim: 'gnome-terminal -- nvim', // يفتح Neovim داخل تيرمينال جديد
    ollama: 'gnome-terminal -- bash -c "ollama launch claude --model qwen2.5-coder:1.5b; exec bash"', // يشغل سيرفر Ollama
    docker: 'gnome-terminal -- docker ps', // يعرض الحاويات (كمثال)
    git: 'gnome-terminal -- git status',
    python: 'gnome-terminal -- python3',
    node: 'gnome-terminal -- node'
};

app.post('/open-tool', (req, res) => {
    const { id } = req.body;
    const command = COMMANDS[id];

    if (command) {
        console.log(`🚀 Launching ${id} using command: ${command}`);

        exec(command, (err) => {
            if (err) {
                console.error(`Error executing ${id}:`, err);
                return res.status(500).json({ error: `Could not launch ${id}` });
            }
            res.json({ message: `${id} launched!` });
        });
    } else {
        res.status(404).json({ error: "Command not defined for this tool" });
    }
});

app.listen(3001, () => console.log('🚀 Bridge ready for all tools at http://localhost:3001'));
