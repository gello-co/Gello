// Leaderboard JavaScript

let currentMember = '';
let currentMemberId = null;

// sets current member when clicking the encouragement button (only called on the admin page)
function setCurrentMember(memberName, memberId) {
    currentMember = memberName;
    currentMemberId = memberId;
    document.getElementById('memberName').value = memberName;
}

// handles the encouragement form submisison
document.addEventListener('DOMContentLoaded', function() {
    const encouragementForm = document.getElementById('encouragementForm');
    
    if (encouragementForm) {
        encouragementForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const message = document.getElementById('encouragementMessage').value;
            
            // updates the shoutout on the leaderboard lsit
            const shoutoutElement = document.getElementById(`shoutout-${currentMemberId}`);
            if (shoutoutElement) {
                shoutoutElement.textContent = message;
            }
            
            // updates the top three section if the member is on the top 3
            const topShoutoutElement = document.getElementById(`top-shoutout-${currentMemberId}`);
            if (topShoutoutElement) {
                topShoutoutElement.textContent = message;
            }
            
            alert(`Encouragement sent to ${currentMember}!`);
            document.getElementById('encouragementMessage').value = '';
            
            // closes bootstrap modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('encouragementModal'));
            if (modal) {
                modal.hide();
            }
        });
    }
});