import express from 'express';
import mongoose from 'mongoose';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

import User from './models/user.js'; // Assuming you have defined the User model

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Enable CORS for all routes
app.use(cors());

async function fetchUsersByRepos(location, page = 1, perPage = 100) {
    try {
        console.log(`Fetching users by repositories, page ${page}...`);
        const query = `location:"${location}" repos:>0 sort:repositories-desc`;
        const response = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            console.log(`Users fetched for page ${page}:`, data);
            return data.items;
        } else {
            console.error('Failed to fetch users:', response.status, response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error fetching users by repositories:', error);
        return [];
    }
}

async function fetchUserReposCount(username) {
    try {
        console.log(`Fetching repository count for user: ${username}`);
        const response = await fetch(`https://api.github.com/users/${username}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        if (response.ok) {
            const user = await response.json();
            return user.public_repos;
        } else {
            console.error(`Failed to fetch repository count for user ${username}:`, response.status, response.statusText);
            return 0;
        }
    } catch (error) {
        console.error('Error fetching repository count for user:', error);
        return 0;
    }
}

async function getTopUsers(location) {
    try {
        const perPage = 100;
        const usersPage1 = await fetchUsersByRepos(location, 1, perPage);
        const usersPage2 = await fetchUsersByRepos(location, 2, perPage);
        const usersPage3 = await fetchUsersByRepos(location, 3, perPage);
        const users = [...usersPage1, ...usersPage2, ...usersPage3];

        const userReposCounts = await Promise.all(users.map(async user => {
            const repoCount = await fetchUserReposCount(user.login);
            return {
                login: user.login,
                avatar_url: user.avatar_url,
                html_url: user.html_url,
                repoCount: repoCount // Corrected here
            };
        }));

        // Sort users by the number of repositories in descending order and take the top 300
        userReposCounts.sort((a, b) => b.repoCount - a.repoCount);
        return userReposCounts.slice(0, 300);
    } catch (error) {
        console.error('Error getting top users:', error);
        return [];
    }
}

async function storeUsersInDatabase(users) {
    try {
        for (const user of users) {
            // Check if the user already exists in the database
            const existingUser = await User.findOne({ username: user.login });

            if (existingUser) {
                // If user exists, update their data
                existingUser.avatar_url = user.avatar_url;
                existingUser.html_url = user.html_url;
                existingUser.repositories_count = user.repoCount; // Correctly assign repoCount
                await existingUser.save();
            } else {
                // If user does not exist, create a new user
                const newUser = new User({
                    username: user.login,
                    avatar_url: user.avatar_url,
                    html_url: user.html_url,
                    repositories_count: user.repoCount // Correctly assign repoCount
                });
                await newUser.save();
            }
        }
        console.log('Users stored in the database');
    } catch (error) {
        console.error('Error storing users in the database:', error);
    }
}

//
// Route to trigger fetching and storing users
app.get('/fetch-and-store-users', async (req, res) => {
    try {
        const location = 'Sri Lanka'; // Specify the location
        const topUsers = await getTopUsers(location);
        await storeUsersInDatabase(topUsers);
        res.status(200).json({ message: 'Users fetched and stored successfully' });
    } catch (error) {
        console.error('Error fetching and storing users:', error);
        res.status(500).json({ message: 'Error fetching and storing users' });
    }
});

//hell
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/get-users', async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users from database:', error);
        res.status(500).json({ message: 'Error fetching users from database' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
