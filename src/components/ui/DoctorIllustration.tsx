export function DoctorIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      role="img"
      aria-label="Portrait of a lady doctor in a white coat with a stethoscope around her neck, beside a heart with signal lines"
      className={className}
    >
      <defs>
        <radialGradient id="docSkin" cx="0.42" cy="0.3" r="0.85">
          <stop offset="0%" stopColor="#fbe0ca" />
          <stop offset="60%" stopColor="#f2c6a2" />
          <stop offset="100%" stopColor="#e2a97f" />
        </radialGradient>
        <linearGradient id="docHair" x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#4b3529" />
          <stop offset="55%" stopColor="#33241b" />
          <stop offset="100%" stopColor="#1d1310" />
        </linearGradient>
        <linearGradient id="docCoat" x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#eef7f0" />
          <stop offset="100%" stopColor="#dcebe0" />
        </linearGradient>
        <linearGradient id="docScrub" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="docLip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d98a80" />
          <stop offset="100%" stopColor="#b85f57" />
        </linearGradient>
        <linearGradient id="docTube" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="45%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="docSteel" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="45%" stopColor="#b8c2cc" />
          <stop offset="100%" stopColor="#7d8a97" />
        </linearGradient>
        <linearGradient id="docHeart" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx="120" cy="234" rx="84" ry="8" fill="#15803d" opacity="0.08" />

      {/* ---- hair (back) ---- */}
      <path
        d="M119 46 C90 46 73 66 73 98 C73 126 71 152 81 168 C88 179 99 185 110 186 L130 186 C141 185 152 179 159 168 C169 152 167 126 167 98 C167 66 148 46 119 46 Z"
        fill="url(#docHair)"
      />

      {/* ---- neck ---- */}
      <path
        d="M108 116 C108 133 106 146 101 157 C110 164 130 164 139 157 C134 146 132 133 132 116 Z"
        fill="url(#docSkin)"
      />
      {/* under-jaw shadow */}
      <path
        d="M101 118 C106 128 134 128 139 118 C137 133 132 141 120 141 C108 141 103 133 101 118 Z"
        fill="#cf9468"
        opacity="0.55"
      />

      {/* ---- white coat / apron ---- */}
      <path
        d="M31 240 C31 211 33 193 41 182 C50 170 65 165 84 162 C94 160 100 157 105 150 L135 150 C140 157 146 160 156 162 C175 165 190 170 199 182 C207 193 209 211 209 240 Z"
        fill="url(#docCoat)"
      />
      {/* shoulder seams for structure */}
      <path d="M84 162 C82 176 82 198 84 216" fill="none" stroke="#d6e9dc" strokeWidth="1.4" />
      <path d="M156 162 C158 176 158 198 156 216" fill="none" stroke="#d6e9dc" strokeWidth="1.4" />
      {/* scrub neckline */}
      <path
        d="M105 150 C110 160 130 160 135 150 C133 156 128 159 120 159 C112 159 107 156 105 150 Z"
        fill="#dcfce7"
      />
      <path
        d="M106 151 L119 194 L134 151 C130 157 125 160 120 160 C115 160 109 157 106 151 Z"
        fill="url(#docScrub)"
      />
      {/* lab coat lapels */}
      <path
        d="M105 150 C103 163 109 178 120 190 C110 190 100 184 95 171 C92 163 92 155 95 150 Z"
        fill="#ffffff"
        stroke="#dcebe0"
        strokeWidth="1.5"
      />
      <path
        d="M135 150 C137 163 131 178 120 190 C130 190 140 184 145 171 C148 163 148 155 145 150 Z"
        fill="#ffffff"
        stroke="#dcebe0"
        strokeWidth="1.5"
      />
      {/* coat buttons */}
      <circle cx="120" cy="205" r="2.4" fill="#c7dccf" />
      <circle cx="120" cy="218" r="2.4" fill="#c7dccf" />
      {/* name badge */}
      <rect x="150" y="196" width="20" height="26" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.4" />
      <rect x="153" y="201" width="14" height="3" rx="1.5" fill="#22c55e" />
      <rect x="153" y="207" width="14" height="2" rx="1" fill="#cbd5e1" />
      <rect x="153" y="212" width="10" height="2" rx="1" fill="#cbd5e1" />

      {/* ---- head (gentle 3/4 turn) ---- */}
      <g transform="rotate(-6 120 96)">
        {/* far ear */}
        <ellipse cx="151" cy="96" rx="5" ry="8" fill="url(#docSkin)" />
        <path d="M150 92 q3 3 0 7" fill="none" stroke="#cf9468" strokeWidth="1.3" strokeLinecap="round" />

        {/* head + jaw */}
        <ellipse cx="119" cy="93" rx="31" ry="38" fill="url(#docSkin)" />
        <path d="M119 131 C132 130 144 121 149 106 C146 124 134 136 120 137 C111 137 103 134 97 127 C103 130 111 131 119 131 Z" fill="#d99b74" opacity="0.4" />
        {/* cheek/jaw contour on the turned side */}
        <path d="M144 84 C150 94 149 112 138 124" fill="none" stroke="#dda57e" strokeWidth="2" opacity="0.5" />

        {/* hairline + side-swept fringe */}
        <path
          d="M88 94 C86 66 100 48 119 48 C141 48 157 63 159 92 C156 79 149 70 139 66 C129 62 122 71 111 76 C99 81 91 86 88 94 Z"
          fill="url(#docHair)"
        />
        {/* part line + strands */}
        <path d="M118 51 C127 49 137 53 144 62 C138 56 128 54 120 57 C112 60 106 67 102 76 C101 66 108 54 118 51 Z" fill="#634a3b" opacity="0.55" />
        {/* near side hair falling over the shoulder */}
        <path
          d="M88 90 C83 116 82 146 88 172 C91 181 95 186 99 187 C95 170 93 140 95 112 C96 103 97 96 95 90 Z"
          fill="url(#docHair)"
        />

        {/* eyebrows */}
        <path d="M99 84 Q106 79 114 83" fill="none" stroke="#2c1e17" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M125 81 Q132 77 139 82" fill="none" stroke="#2c1e17" strokeWidth="2.4" strokeLinecap="round" />

        {/* near eye */}
        <path d="M100 92 Q107 86 114 92 Q107 97 100 92 Z" fill="#fbf6f2" />
        <circle cx="107" cy="92" r="3.4" fill="#5a3a28" />
        <circle cx="107" cy="92" r="1.7" fill="#1a1210" />
        <circle cx="108.2" cy="90.8" r="0.9" fill="#ffffff" />
        <path d="M99 91 Q107 85 115 91" fill="none" stroke="#2c1e17" strokeWidth="1.6" strokeLinecap="round" />

        {/* far eye */}
        <path d="M126 91 Q131 86 137 91 Q131 95 126 91 Z" fill="#fbf6f2" />
        <circle cx="131.5" cy="91" r="2.9" fill="#5a3a28" />
        <circle cx="131.5" cy="91" r="1.4" fill="#1a1210" />
        <circle cx="132.4" cy="90" r="0.8" fill="#ffffff" />
        <path d="M125 90 Q131 85 138 90" fill="none" stroke="#2c1e17" strokeWidth="1.5" strokeLinecap="round" />

        {/* nose (turned, with side shading) */}
        <path d="M116 82 C115 90 114 96 112 100 C111 102 113 104 116 103" fill="none" stroke="#d1956c" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M112 100 q3 2 6 0" fill="none" stroke="#cf9468" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />

        {/* blush */}
        <ellipse cx="101" cy="104" rx="6.5" ry="4" fill="#ec9f83" opacity="0.45" />
        <ellipse cx="140" cy="103" rx="5.5" ry="3.5" fill="#ec9f83" opacity="0.4" />

        {/* lips */}
        <path d="M106 112 C110 108 122 108 126 112 C121 114 111 114 106 112 Z" fill="url(#docLip)" />
        <path d="M106 112 C110 117 122 117 126 112 C121 120 111 120 106 112 Z" fill="#b0534b" />
        <path d="M107 112 Q116 114 125 112" fill="none" stroke="#8f3f38" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* ---- stethoscope: headset around the neck, tubes over both shoulders ---- */}
      {/* back-of-neck segment */}
      <path d="M108 137 C114 133 126 133 132 137" fill="none" stroke="#1f2937" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      {/* left tube over shoulder, down the chest */}
      <path
        d="M108 137 C97 144 88 154 86 166 C84 178 87 189 93 196 C99 203 109 206 116 206"
        fill="none"
        stroke="url(#docTube)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* right tube over shoulder, down the chest */}
      <path
        d="M132 137 C143 144 152 154 154 166 C156 178 153 189 147 196 C141 203 131 206 124 206"
        fill="none"
        stroke="url(#docTube)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* tube highlights */}
      <path d="M108.8 139 C99 146 90.5 155 88.5 166 C87 177 89.5 187 95 194" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M131.2 139 C141 146 149.5 155 151.5 166 C153 177 150.5 187 145 194" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* eartips tucked behind the neck */}
      <ellipse cx="108" cy="136" rx="3.4" ry="4.4" fill="#111827" transform="rotate(35 108 136)" />
      <ellipse cx="132" cy="136" rx="3.4" ry="4.4" fill="#111827" transform="rotate(-35 132 136)" />
      {/* junction + stem */}
      <circle cx="120" cy="205" r="4.5" fill="#1f2937" />
      <path d="M120 206 L120 210" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
      {/* chest piece */}
      <circle cx="120" cy="216" r="10" fill="url(#docSteel)" stroke="#64748b" strokeWidth="1.6" />
      <circle cx="120" cy="216" r="6" fill="#dbe3ea" />
      <circle cx="120" cy="216" r="2.4" fill="#94a3b8" />
      <circle cx="116.8" cy="212.8" r="1.8" fill="#ffffff" opacity="0.7" />

      {/* ---- heart with signal lines ---- */}
      <g transform="translate(167 46) scale(2.6)">
        <path
          d="M12 20.6 C12 20.6 3.9 15.3 3.9 9.2 C3.9 6.3 6.1 4.1 9 4.1 C10.8 4.1 11.6 5.1 12 5.9 C12.4 5.1 13.2 4.1 15 4.1 C17.9 4.1 20.1 6.3 20.1 9.2 C20.1 15.3 12 20.6 12 20.6 Z"
          fill="url(#docHeart)"
        />
        <path
          d="M7 6.9 C7.9 5.7 9.3 5.3 10.4 5.7 C9.2 6.1 8.2 7.1 7.9 8.5 C7.6 9.4 7.7 10.1 7.7 10.6 C7 9.4 6.6 7.9 7 6.9 Z"
          fill="#ffffff"
          opacity="0.35"
        />
        <path
          d="M4.6 11.7 H8 L9.4 7.9 L11.7 15.1 L13.1 11.7 H19.4"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* signalling arcs */}
      <path d="M198 55 C203 50 210 50 215 55" fill="none" stroke="#f43f5e" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M204 44 C212 36 223 37 229 46" fill="none" stroke="#f43f5e" strokeWidth="2.6" strokeLinecap="round" opacity="0.62" />
      <path d="M210 33 C220 23 234 26 239 38" fill="none" stroke="#f43f5e" strokeWidth="2.6" strokeLinecap="round" opacity="0.38" />
    </svg>
  )
}
