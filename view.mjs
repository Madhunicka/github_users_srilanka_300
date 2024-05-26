document.addEventListener('DOMContentLoaded', () => {
    //function
    async function fetchUsers() {
        try {
            const response = await fetch('https://ghbackend-tawny.vercel.app/get-users');
            if (response.ok) {
                const users = await response.json();
                
                displayUsers(users);
            } else {
                console.error('Failed to fetch users:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }

    function displayUsers(users) {
        const container = document.getElementById('users-container');
        container.innerHTML = ''; // Clear existing content

        // Create table
        const table = document.createElement('table');
        table.classList.add('user-table');

        // Create table header
        const tableHeader = document.createElement('thead');
        tableHeader.innerHTML = `
            <tr>
                <th>Avatar</th>
                <th>Username</th>
                <th>Repositories</th>
                <th>Profile Link</th>
            </tr>
        `;
        table.appendChild(tableHeader);

        // Create table body
        const tableBody = document.createElement('tbody');
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${user.avatar_url}" alt="${user.username}" width="50"></td>
                <td>${user.username}</td>
                <td>${user.repositories_count}</td>
                <td><a href="${user.html_url}" target="_blank">View Profile</a></td>
            `;
            tableBody.appendChild(row);
        });
        table.appendChild(tableBody);

        container.appendChild(table);
    }

    fetchUsers();
});
