function selectRole(role) {
    document.getElementById('role' + role.charAt(0).toUpperCase() + role.slice(1)).checked = true;
    
    // Update visual selection
    document.querySelectorAll('.role-card').forEach(card => {
        card.style.borderColor = '#fae1b8';
        card.style.boxShadow = 'none';
    });
    event.currentTarget.style.borderColor = '#742e10';
    event.currentTarget.style.boxShadow = '0 5px 15px rgba(116, 46, 16, 0.2)';
}

document.getElementById('joinTeamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const teamCode = document.getElementById('teamCode').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    
    // TODO: Replace with actual API call
    console.log('Joining team:', { teamCode, role });
    
    // Show success modal (for demo)
    const modal = new bootstrap.Modal(document.getElementById('joinSuccessModal'));
    modal.show();
    
    // Redirect after 2 seconds (for demo)
    setTimeout(() => {
        window.location.href = '/teams';
    }, 2000);
});