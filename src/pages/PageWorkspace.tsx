/* PageWorkspace — 组织设置(owner 改空间名;其他成员只读)。
 *
 * 范围:基本信息——组织名(owner 可改)+ 组织 ID / 套餐 / 成员数 / 创建时间(只读),
 *   并给「管理成员」「套餐与计费」两个跳转。配额/网络策略等归超管或专门页,不在此。
 * 权限:改名仅 owner(canManageWorkspace);后端 PATCH /v1/tenant 走 chainOwner。
 * 数据:useWorkspace / useUpdateWorkspace。
 * UI 用 house 基元,精修留给 claude-design。
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
  Button, Input, Label, Badge, toast,
} from '@talon-sandbox/react';
import { PageHeader } from '@talon-sandbox/react';
import { useT } from '../i18n/useT';
import { useRole, canManageWorkspace } from '../lib/permissions';
import { useWorkspace, useUpdateWorkspace } from '../hooks/useWorkspace';
import { EmptyState } from '../components';

export function PageWorkspace() {
  const t = useT();
  const nav = useNavigate();
  const role = useRole();
  const canManage = canManageWorkspace(role);

  const { data: ws, isLoading, isError, error } = useWorkspace();
  const updateMutation = useUpdateWorkspace();

  const [name, setName] = useState('');
  // 数据到达后回填输入框(首次 / 刷新后)。
  useEffect(() => { if (ws?.name) setName(ws.name); }, [ws?.name]);

  const dirty = ws ? name.trim() !== ws.name && name.trim() !== '' : false;

  const save = () => {
    if (!canManage || !dirty || updateMutation.isPending) return;
    updateMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => toast.success(t('org.saved')),
        onError: () => toast.error(t('org.saveFailed')),
      },
    );
  };

  const createdAt = ws?.created_at ? new Date(ws.created_at * 1000).toLocaleDateString() : '—';

  return (
    <>
      <PageHeader title={t('org.title')} desc={t('org.desc')} />

      <div className="page-body" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isLoading && <EmptyState variant="loading" />}
        {isError && <EmptyState variant="error" error={error} />}

        {!isLoading && !isError && ws && (
          <Card>
            <CardHeader>
              <CardTitle>{t('org.general')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Label htmlFor="org-name">{t('org.name')}</Label>
                  <Input
                    id="org-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('org.namePlaceholder')}
                    maxLength={80}
                    disabled={!canManage}
                    title={!canManage ? t('org.ownerOnly') : undefined}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Label>{t('org.id')}</Label>
                  <Input value={ws.id} readOnly disabled />
                </div>

                <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Label>{t('org.plan')}</Label>
                    <Badge variant="muted">{ws.plan}</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Label>{t('org.members')}</Label>
                    <span style={{ fontSize: 13, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{ws.member_count}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Label>{t('org.createdAt')}</Label>
                    <span style={{ fontSize: 13, color: 'var(--fg-1)', fontFamily: 'var(--font-mono)' }}>{createdAt}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="ghost" size="sm" onClick={() => nav('/members')}>{t('org.viewMembers')}</Button>
                  <Button variant="ghost" size="sm" onClick={() => nav('/billing')}>{t('org.viewBilling')}</Button>
                </div>
              </div>
            </CardContent>
            {canManage && (
              <CardFooter>
                <Button variant="primary" loading={updateMutation.isPending} disabled={!dirty} onClick={save}>
                  {t('org.save')}
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
