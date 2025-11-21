#!/bin/bash

echo "Fetching latest from remote..."
git fetch origin -q

branches=("points-shop-page" "leaderboard-page" "fix-hbs")

for branch in "${branches[@]}"; do
    echo "==================================================="
    echo "🌿 Branch: $branch"

    # Get PR info
    echo "📋 Pull Request Status:"
    gh pr list --head "$branch" --state all --json number,title,state,updatedAt,url --template \
    '{{if .}}{{range .}}   • #{{.number}} {{.title}} ({{.state}})
     Updated: {{.updatedAt}}
     Link: {{.url}}
{{end}}{{else}}   (No PR found){{end}}'

    echo ""
    echo "📍 Latest Remote Commit:"
    # Use gh api to get specific branch details
    gh api "repos/:owner/:repo/branches/$branch" --template \
    '   Hash: {{.commit.sha | printf "%.7s"}}
   Author: {{.commit.commit.author.name}}
   Date: {{.commit.commit.author.date}}
   Message: {{.commit.commit.message}}
' 2>/dev/null || echo "   (Branch not found on remote)"

    echo ""
done

echo "==================================================="
echo "🧹 Local Migration Branches (chore/update-*):"
git branch --list "chore/update-*" -v
