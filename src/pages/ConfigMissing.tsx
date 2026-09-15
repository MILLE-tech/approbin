export default function ConfigMissing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Configuration manquante</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Les variables <code className="bg-slate-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> et{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> ne sont pas définies.
        </p>
        <p className="text-sm text-slate-500 leading-relaxed mt-3">
          Copiez <code className="bg-slate-100 px-1 py-0.5 rounded">.env.example</code> vers{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code>, renseignez vos identifiants Supabase, puis
          redémarrez l'application. Voir le README pour la procédure complète.
        </p>
      </div>
    </div>
  )
}
