const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
const needle = '        {/* Logout */}';
const insert = `        {/* List a property CTA */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setViewState('list-property')}
            className="btn-primary w-full justify-center py-2 text-xs"
          >
            + List a Property
          </button>
        </div>

`;
c = c.replace(needle, insert + needle);
fs.writeFileSync('src/App.tsx', c);
console.log('done — inserted List a Property button');
