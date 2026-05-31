/* src/pages/_members/InviteMemberDialog.tsx
 * 邀请成员对话框：email + role → POST /v1/tenants/{tid}/invitations。
 *
 * 若响应带 accept_url（后端未配邮件发送），不关闭对话框，改为展示
 * 可复制的邀请链接，引导 owner 手动发给被邀请人。
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Button, Input, toast,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  FormField, FormLabel, FormControl, FormDescription,
} from '@talon-sandbox/react';
import { useT } from '../../i18n/useT';
import { TlnIcon } from '../../icons/TlnIcon';
import { useCreateInvitation } from '../../hooks/useMembers';
import type { MemberRole } from '../../api/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

// 邮箱基础校验（前端只做轻量校验，权威在后端）
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteMemberDialog({ open, onClose }: Props) {
  const t = useT();
  const createMutation = useCreateInvitation();

  const [email, setEmail] = useState('');
  const [role,  setRole]  = useState<MemberRole>('developer');
  // 后端未配邮件时返回的邀请链接，拿到后切到「复制链接」态而非直接关闭
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);

  const valid = EMAIL_RE.test(email);
  const busy  = createMutation.isPending;

  const reset = () => {
    setEmail('');
    setRole('developer');
    setAcceptUrl(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!valid || busy) return;
    createMutation.mutate(
      { email, role },
      {
        onSuccess: (inv) => {
          if (inv.accept_url) {
            // 未配邮件：保留对话框，展示链接让用户手动复制
            setAcceptUrl(inv.accept_url);
            toast.success(t('members.inviteSuccess'));
          } else {
            toast.success(t('members.inviteSuccess'));
            handleClose();
          }
        },
        onError: () => toast.error(t('members.inviteFailed')),
      },
    );
  };

  const handleCopyLink = async () => {
    if (!acceptUrl) return;
    try {
      await navigator.clipboard.writeText(acceptUrl);
      toast.success(t('members.inviteLinkCopied'));
    } catch {
      toast.error(t('common.loadFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TlnIcon name="users" size={16} style={{ color: 'var(--acc)' }} />
              {t('members.inviteTitle')}
            </span>
          </DialogTitle>
        </DialogHeader>

        {acceptUrl ? (
          // ── 邀请链接展示态（后端未配邮件） ───────────────────────────────
          <div className="dlg-form-body">
            <FormField>
              <FormLabel>{t('members.inviteLinkTitle')}</FormLabel>
              <FormControl>
                <Input mono readOnly value={acceptUrl} onFocus={e => e.currentTarget.select()} />
              </FormControl>
              <FormDescription>{t('members.inviteLinkDesc')}</FormDescription>
            </FormField>
          </div>
        ) : (
          // ── 邀请表单态 ───────────────────────────────────────────────────
          <div className="dlg-form-body">
            <FormField error={email.length > 0 && !valid ? true : undefined}>
              <FormLabel htmlFor="inv-email">{t('members.inviteEmail')}</FormLabel>
              <FormControl>
                <Input
                  id="inv-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value.trim())}
                  placeholder={t('members.inviteEmailPlaceholder')}
                  error={email.length > 0 && !valid}
                />
              </FormControl>
            </FormField>
            <FormField>
              <FormLabel>{t('members.inviteRole')}</FormLabel>
              <FormControl>
                <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  {/* owner 不可经邀请直接授予（后端 400），故只提供 developer / admin。 */}
                  <SelectContent>
                    <SelectItem value="developer">{t('members.role.developer')}</SelectItem>
                    <SelectItem value="admin">{t('members.role.admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>{t('members.inviteRoleHint')}</FormDescription>
            </FormField>
          </div>
        )}

        <DialogFooter>
          {acceptUrl ? (
            <>
              <Button variant="ghost" onClick={handleClose}>{t('common.close')}</Button>
              <Button variant="primary" onClick={handleCopyLink}>
                <TlnIcon name="copy" size={14} />
                {t('members.inviteLinkCopy')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>{t('common.cancel')}</Button>
              <Button variant="primary" disabled={!valid || busy} loading={busy} onClick={handleSubmit}>
                <TlnIcon name="check" size={14} />
                {t('members.inviteSubmit')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
