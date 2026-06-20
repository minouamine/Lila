// =====================================================
// عرض حالة طلب الحساب التجاري (قيد المراجعة / مرفوض)
// يُستخدم داخل my-account.html عبر renderUpgradeButton
// =====================================================
window.pendingBusinessProfile = {
    
    /**
     * يُرجع HTML البانر المناسب حسب verification_status
     * أو null إن لم تكن هناك حالة خاصة (approved أو لا يوجد طلب)
     * @param {object} businessProfile - يحتوي verification_status و verification_rejected_reason
     * @param {string} currentLang - 'ar' أو 'fr'
     * @returns {string|null}
     */
    getBanner: function(businessProfile, currentLang) {
        if (!businessProfile) return null;
        
        const status = businessProfile.verification_status;
        
        if (status === 'pending') {
            return `
                <div class="upgrade-account-btn" style="margin-top: 12px; padding: 10px 24px; border-radius: 20px; background: #fff3cd; color: #856404; font-weight: bold; display: inline-block;"
                    data-ar="⏳ طلب حسابك التجاري قيد المراجعة" data-fr="⏳ Votre demande de compte professionnel est en cours d'examen">
                    ⏳ طلب حسابك التجاري قيد المراجعة
                </div>
            `;
        }
        
        if (status === 'rejected') {
            const reason = businessProfile.verification_rejected_reason ?
                `<br><span style="font-size:12px; font-weight:normal;">السبب: ${businessProfile.verification_rejected_reason}</span>` :
                '';
            return `
                <div class="upgrade-account-btn" style="margin-top: 12px; padding: 10px 24px; border-radius: 20px; background: #f8d7da; color: #721c24; font-weight: bold; display: inline-block;"
                    data-ar="❌ تم رفض طلب حسابك التجاري" data-fr="❌ Votre demande a été refusée">
                    ❌ تم رفض طلب حسابك التجاري${reason}
                </div>
            `;
        }
        
        // approved أو أي حالة أخرى: لا بانر خاص، العرض الأصلي يستمر
        return null;
    }
    
};