#!/bin/bash

# Remove unused imports
sed -i '/getFullPath\|generateDocumentId\|saveDocument/d' src/api/server.ts

# Replace req with _req where it's alone
sed -i 's/(req: Request,/(_req: Request,/g' src/api/server.ts

# Fix remaining req references in middleware
sed -i 's/\(_req: Request\)/\1/g' src/api/server.ts

echo "Fixed TypeScript issues"
