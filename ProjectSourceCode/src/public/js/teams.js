function selectRole(role) {
    document.getElementById('role' + role.charAt(0).toUpperCase() + role.slice(1)).checked = true;
    
    // Update visual selection
    document.querySelectorAll('.role-card').forEach(card => {
        card.style.borderColor = '#fae1b8';
        card.style.boxShadow = 'none';
    });
    event.currentTarget.style.borderColor = '#742e10';
    event.currentTarget.style.boxShadow = '0 3px 10px rgba(116, 46, 16, 0.2)';
}

document.getElementById('joinTeamForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const teamCode = document.getElementById('teamCode').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    
    // TODO: Replace with actual API call
    console.log('Joining team:', { teamCode, role });
    
    // Show success modal
    const modal = new bootstrap.Modal(document.getElementById('joinSuccessModal'));
    modal.show();
    
    // Reload page after 2 seconds
    setTimeout(() => {
        window.location.reload();
    }, 2000);
});