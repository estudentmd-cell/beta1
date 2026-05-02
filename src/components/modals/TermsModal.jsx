import useUIStore from '../../stores/useUIStore';

export default function TermsModal() {
  const { closeModal } = useUIStore();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={closeModal}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-[16px] shadow-lg w-full max-w-lg max-h-[85vh] overflow-y-auto animate-[modalIn_0.3s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-bdr px-5 py-4 flex items-center justify-between rounded-t-[16px]">
          <h2 className="font-serif text-lg">Termeni și Condiții</h2>
          <button onClick={closeModal} className="text-tx-3 hover:text-tx-1 text-xl">×</button>
        </div>

        <div className="p-5 space-y-4 text-sm text-tx-2 leading-relaxed">
          <section>
            <h3 className="font-semibold text-tx-1 mb-1">1. Serviciul</h3>
            <p>Fotocarte oferă servicii de creare și tipărire a albumelor foto premium. Prin utilizarea platformei, acceptați termenii descriși mai jos.</p>
          </section>

          <section>
            <h3 className="font-semibold text-tx-1 mb-1">2. Fotografiile</h3>
            <p>Fotografiile încărcate sunt stocate în siguranță și utilizate exclusiv pentru crearea albumului comandat. Nu le distribuim și nu le folosim în alte scopuri.</p>
          </section>

          <section>
            <h3 className="font-semibold text-tx-1 mb-1">3. Notificări SMS</h3>
            <p>Prin furnizarea numărului de telefon, sunteți de acord să primiți notificări SMS legate de statusul comenzii. Vă puteți dezabona oricând.</p>
          </section>

          <section>
            <h3 className="font-semibold text-tx-1 mb-1">4. Plăți</h3>
            <p>Prețurile sunt afișate în MDL (lei moldovenești). Plata se efectuează prin card bancar sau transfer. Livrarea este gratuită pe teritoriul Moldovei.</p>
          </section>

          <section>
            <h3 className="font-semibold text-tx-1 mb-1">5. Contact</h3>
            <p>Pentru întrebări sau reclamații, ne puteți contacta prin email sau telefon. Echipa Fotocarte vă va răspunde în cel mai scurt timp.</p>
          </section>
        </div>

        <div className="p-5 pt-0">
          <button
            onClick={closeModal}
            className="w-full py-3 rounded font-semibold text-sm bg-tx-1 text-white hover:bg-tx-2 transition-colors min-h-[44px]"
          >
            Am înțeles
          </button>
        </div>
      </div>
    </div>
  );
}
