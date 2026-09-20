import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { PlayCircle, BookOpen, CheckCircle, Code, Video, FileText, Plus, Trash2 } from 'lucide-react';
import { dbHelpers } from '../lib/db';

type Course = { id: string; title: string; platform: string; progress: number; duration: string; iconType: string; url?: string; completed?: boolean; };
type Note = { id: string; courseId: string; courseName: string; title: string; content: string; createdAt: string; };
type FilterTab = 'in_progress' | 'youtube' | 'completed' | 'notes';

const getIcon = (type: string) => {
  switch (type) {
    case 'book': return <BookOpen size={22} className="text-amber-500" />;
    case 'code': return <Code size={22} className="text-blue-500" />;
    default:     return <PlayCircle size={22} className="text-red-500" />;
  }
};

const tabs = [
  { id: 'in_progress', label: 'In Progress', icon: PlayCircle },
  { id: 'youtube',     label: 'YouTube',     icon: Video },
  { id: 'completed',   label: 'Completed',   icon: CheckCircle },
  { id: 'notes',       label: 'Notes',       icon: FileText },
];

const YOUTUBE_TOPICS = ['React', 'TypeScript', 'Python', 'Machine Learning', 'JavaScript', 'System Design', 'Data Structures', 'Next.js'];

const getYouTubeVideoId = (url?: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

function AddCourseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: any) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('YouTube');
  const [duration, setDuration] = useState('');
  const [iconType, setIconType] = useState('video');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    try { await onAdd({ title, platform, duration, iconType, url: url || undefined }); onClose(); }
    catch { alert('Failed to add course'); } finally { setIsLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end backdrop-blur-md" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--color-surface)] rounded-t-3xl w-full max-w-md mx-auto p-6 animate-slide-up shadow-2xl">
        <h2 className="text-xl font-black mb-5">Add Course</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Course title" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          <input value={platform} onChange={e => setPlatform(e.target.value)} required placeholder="Platform (e.g. Udemy, YouTube)" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration (e.g. 12 hours)" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (optional)" type="url" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Type</label>
            <div className="flex gap-2">
              {[{ v: 'video', label: '🎬 Video' }, { v: 'book', label: '📚 Book' }, { v: 'code', label: '💻 Code' }].map(o => (
                <button key={o.v} type="button" onClick={() => setIconType(o.v)} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${iconType === o.v ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-2)] text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-60">{isLoading ? 'Saving...' : 'Add Course'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddNoteModal({ courses, onClose, onAdd }: { courses: Course[]; onClose: () => void; onAdd: (d: any) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    const course = courses.find(c => c.id === courseId);
    try { await onAdd({ title, content, courseId, courseName: course?.title ?? 'General' }); onClose(); }
    catch { alert('Failed to add note'); } finally { setIsLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end backdrop-blur-md" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--color-surface)] rounded-t-3xl w-full max-w-md mx-auto p-6 animate-slide-up shadow-2xl">
        <h2 className="text-xl font-black mb-5">Add Note</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Note title" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          {courses.length > 0 && (
            <select value={courseId} onChange={e => setCourseId(e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors">
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
          <textarea value={content} onChange={e => setContent(e.target.value)} required placeholder="Write your note here..." rows={5} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none" />
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-2)] text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg disabled:opacity-60">{isLoading ? 'Saving...' : 'Save Note'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Learning() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('in_progress');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub1 = dbHelpers.subscribeToCourses((fetched) => { setCourses(fetched as Course[]); setIsLoading(false); });
    const unsub2 = dbHelpers.subscribeToNotes((fetched) => setNotes(fetched as Note[]));
    return () => { unsub1(); unsub2(); };
  }, []);

  const updateProgress = async (course: Course, delta: number) => {
    const newProgress = Math.min(100, Math.max(0, course.progress + delta));
    setUpdatingId(course.id);
    try { await dbHelpers.updateCourseProgress(course.id, newProgress); }
    finally { setUpdatingId(null); }
  };

  const inProgress = courses.filter(c => !c.completed && c.progress < 100);
  const completed  = courses.filter(c => c.completed || c.progress >= 100);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black">Learning</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">{inProgress.length} active course{inProgress.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => activeTab === 'notes' ? setShowAddNote(true) : setShowAddCourse(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg press-effect"
        >
          <Plus size={14} /> {activeTab === 'notes' ? 'Note' : 'Course'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as FilterTab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === tab.id ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-white'}`}>
            <tab.icon size={13} />{tab.label}
          </button>
        ))}
      </div>

      {/* IN PROGRESS */}
      {activeTab === 'in_progress' && (
        <div className="flex flex-col gap-3">
          {isLoading ? [1,2].map(i => <div key={i} className="h-28 rounded-2xl skeleton" />) :
          inProgress.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
              <BookOpen size={36} className="mb-3 opacity-30" />
              <p className="font-semibold">No courses in progress</p>
              <p className="text-xs mt-1 text-[var(--color-text-subtle)]">Add your first course to get started</p>
            </div>
          ) : inProgress.map(course => {
            const videoId = getYouTubeVideoId(course.url);
            return (
            <Card key={course.id} className="flex flex-col gap-4 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center shadow-inner shrink-0">
                  {getIcon(course.iconType)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{course.title}</h3>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{course.platform}{course.duration ? ` · ${course.duration}` : ''}</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => updateProgress(course, -10)} disabled={updatingId === course.id} className="w-7 h-7 rounded-full bg-[var(--color-surface-2)] text-xs font-bold hover:bg-[var(--color-surface-hover)] transition-colors">-</button>
                  <button onClick={() => updateProgress(course, 10)} disabled={updatingId === course.id} className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-hover)] transition-colors">+</button>
                </div>
                <button onClick={() => dbHelpers.deleteCourse(course.id)} className="w-7 h-7 rounded-full text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 size={12} />
                </button>
              </div>

              {videoId && (
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black/20 shadow-inner">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={course.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-[var(--color-text-muted)]">Progress</span>
                  <span className="text-[var(--color-primary)]">{course.progress}%</span>
                </div>
                <div className="w-full bg-[var(--color-surface)] h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${course.progress}%` }} />
                </div>
                
                {course.progress < 100 && (
                  <button 
                    onClick={() => updateProgress(course, 100 - course.progress)} 
                    disabled={updatingId === course.id}
                    className="w-full mt-3 py-2 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={14} /> Mark as Done
                  </button>
                )}
              </div>
            </Card>
          )})}
          <button onClick={() => setShowAddCourse(true)} className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-500 hover:text-amber-400 transition-all press-effect">
            <Plus size={18} /><span className="font-semibold text-sm">Add a course</span>
          </button>
        </div>
      )}

      {/* YOUTUBE */}
      {activeTab === 'youtube' && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-[var(--color-text-muted)]">Popular YouTube topics to learn — tap a topic to search on YouTube.</p>
          <div className="grid grid-cols-2 gap-3">
            {YOUTUBE_TOPICS.map(topic => (
              <a
                key={topic}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' tutorial')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-red-500/40 hover:bg-red-500/5 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 group-hover:bg-red-500/20 transition-colors">
                  <Video size={16} className="text-red-400" />
                </div>
                <span className="text-sm font-semibold">{topic}</span>
              </a>
            ))}
          </div>
          {courses.filter(c => c.platform?.toLowerCase().includes('youtube')).length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Your YouTube Courses</h2>
              {courses.filter(c => c.platform?.toLowerCase().includes('youtube')).map(course => (
                <Card key={course.id} className="flex items-center gap-3 group mb-2">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0"><Video size={18} className="text-red-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{course.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-[var(--color-surface)] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full" style={{ width: `${course.progress}%` }} />
                      </div>
                      <span className="text-[10px] text-red-400 font-semibold">{course.progress}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPLETED */}
      {activeTab === 'completed' && (
        <div className="flex flex-col gap-3">
          {completed.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
              <CheckCircle size={36} className="mb-3 opacity-30" />
              <p className="font-semibold">No completed courses yet</p>
              <p className="text-xs mt-1 text-[var(--color-text-subtle)]">Keep learning — finished courses will appear here</p>
            </div>
          ) : (
            completed.map(course => (
              <Card key={course.id} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle size={22} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{course.title}</h3>
                  <div className="text-xs text-emerald-400 mt-0.5">✓ Completed · {course.platform}</div>
                </div>
                <button onClick={() => dbHelpers.deleteCourse(course.id)} className="w-7 h-7 rounded-full text-[var(--color-text-muted)] hover:text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={12} />
                </button>
              </Card>
            ))
          )}
        </div>
      )}

      {/* NOTES */}
      {activeTab === 'notes' && (
        <div className="flex flex-col gap-3">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
              <FileText size={36} className="mb-3 opacity-30" />
              <p className="font-semibold">No notes yet</p>
              <p className="text-xs mt-1 text-[var(--color-text-subtle)]">Take notes while learning to retain more</p>
            </div>
          ) : (
            notes.map(note => (
              <Card key={note.id} className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/10 group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-bold text-sm">{note.title}</span>
                  </div>
                  <button onClick={() => dbHelpers.deleteNote(note.id)} className="text-[var(--color-text-muted)] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{note.content}</p>
                <div className="text-[10px] text-[var(--color-text-subtle)] mt-2">
                  {note.courseName} · {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </Card>
            ))
          )}
          <button onClick={() => setShowAddNote(true)} className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-500 hover:text-amber-400 transition-all press-effect">
            <Plus size={18} /><span className="font-semibold text-sm">Add a note</span>
          </button>
        </div>
      )}

      {showAddCourse && <AddCourseModal onClose={() => setShowAddCourse(false)} onAdd={async d => { await dbHelpers.addCourse(d); }} />}
      {showAddNote  && <AddNoteModal courses={courses} onClose={() => setShowAddNote(false)} onAdd={async d => { await dbHelpers.addNote(d); }} />}
    </div>
  );
}
