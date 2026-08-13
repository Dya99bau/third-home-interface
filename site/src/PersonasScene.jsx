import { useState } from 'react'

// Recreated from the live samsam8620.github.io/third-home-interface/ deployment --
// that build's source is minified/unreadable (see README "What is frozen"), so
// this is a rebuild from the actual rendered content and downloaded card images,
// not a copy of any original source code.
const PERSONAS = [
  {
    id: 'newcomer',
    label: 'The Newcomer',
    image: './personas-cards/newcomer.png',
    intro: "Welcome to Wolfsburg, the city with the iconic Volkswagen Factory!",
    body: "Are you here for the weekend? Exploring the city? Perhaps feeling a bit lost and not sure where to stay? Don't worry, you've come to the right place!\n\nThird Home is the perfect spot for Newcomers such as you :) Stay here for days, weeks or even months! We also have all kinds of social events for you to take part in, are you interested?",
    activities: ['Open Studios', 'Playrooms', 'Workshops', 'Cafe / Bar'],
  },
  {
    id: 'artist-curator',
    label: 'Artist-Curator',
    image: './personas-cards/artist-curator.png',
    intro: 'A new talent in town! Welcome to Wolfsburg :)',
    body: "Looking for a space to showcase your art? Third Home is not just a place for living but also a space for people like you who are looking for co-working or exhibition and workshop spaces.\n\nWhat's a better way to meet new people and, possibly, new fans of your work? Host events and find the right crowd to display your pieces! Be the light that shines Third Home <3",
    activities: ['Co-working', 'Performance', 'Workshops', 'Exhibition'],
  },
  {
    id: 'retiree',
    label: 'The Retiree',
    image: './personas-cards/retiree.png',
    intro: "How's it going, Legend? What are your plans for today?",
    body: "Have you heard of this place, Third Home? I suddenly have this urge to play chess with you, finally see who's the better player. What do you say? Ready to lose, old man?\n\nThey have more than Playrooms, you know. They have a very impressive gnome collection in their gardens, which I'm sure you'd love to see. We could also grab a beeeeeer!",
    activities: ['Retreat', 'Playrooms', 'Gardening', 'Cafe / Bar'],
  },
  {
    id: 'urban-wanderer',
    label: 'The Urban Wanderer',
    image: './personas-cards/urban-wanderer.png',
    intro: 'Where did you go this weekend? City hopping can be fun, but what about Wolfsburg itself?',
    body: 'You have to explore the city you live in! Are you free next weekend, though? Let\'s mix it up. Third Home has so many events going on this month. There\'s an exhibition on mass printing and they are screening "2001: A Space Odyssey". They also have a yoga studio on Thursday evenings. Or we could go there right now and take our work with us. They have a great cafe too :)',
    activities: ['Open Studios', 'Co-working', 'Terraces', 'Exhibition'],
  },
  {
    id: 'vw-worker',
    label: 'Volkswagen Worker',
    image: './personas-cards/vw-worker.png',
    intro: 'You look like you need a breather :/ that bad, huh?',
    body: "Well, not to fret. Even though you work odd shift times at the Volkswagen factory, there is a place for you to unwind :)\n\nThird Home is open 24/7. It includes quiet lounging spaces, private terraces and beautiful gardens. But if you still have the energy, there are always events taking place, even at this hour! Do you know Salsa? Or what if we booked a space to have a karaoke night! The fun is endless.",
    activities: ['Performance', 'Terraces', 'Gardening', 'Retreat'],
  },
]

export default function PersonasScene({ onBegin }) {
  const [openId, setOpenId] = useState(null)
  const open = PERSONAS.find((p) => p.id === openId)

  return (
    <div className="personas-root">
      <h1 className="personas-title">Third Home</h1>

      <div className="personas-cards">
        {PERSONAS.map((p) => (
          <button key={p.id} className="persona-card" onClick={() => setOpenId(p.id)}>
            <img src={p.image} alt={p.label} />
            <span className="persona-card-label">{p.label.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="persona-overlay" onClick={() => setOpenId(null)}>
          <div className="persona-detail" onClick={(e) => e.stopPropagation()}>
            <img src={open.image} alt={open.label} className="persona-detail-image" />
            <div className="persona-detail-text">
              <h2>{open.label.toUpperCase()}</h2>
              <p className="persona-intro">{open.intro}</p>
              {open.body.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <div className="persona-activities-label">Suggested activities</div>
              <div className="persona-activities">
                {open.activities.map((a) => (
                  <span key={a} className="persona-activity-pill">{a}</span>
                ))}
              </div>
              <button className="persona-begin-btn" onClick={() => onBegin(open)}>
                Let's begin!
              </button>
              <button className="persona-close-hint" onClick={() => setOpenId(null)}>
                Tap to close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
