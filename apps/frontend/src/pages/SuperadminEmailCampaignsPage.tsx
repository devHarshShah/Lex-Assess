import * as React from 'react';
import { CampaignComposer } from '@/components/email-campaigns/CampaignComposer';
import { CampaignsTab } from '@/components/email-campaigns/CampaignsTab';
import { TemplatesTab } from '@/components/email-campaigns/TemplatesTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SuperadminEmailCampaignsPage() {
  const [tab, setTab] = React.useState('new');
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Email campaigns</h1>
        <p className="text-sm text-muted-foreground">Email students by where they are in the funnel. Every email has the LexAssess header and a one-click unsubscribe.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="new">New campaign</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">My templates</TabsTrigger>
        </TabsList>
        <TabsContent value="new" className="mt-5">
          <CampaignComposer
            onSent={() => {
              setRefreshKey((k) => k + 1);
              setTab('campaigns');
            }}
          />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-5">
          <CampaignsTab refreshKey={refreshKey} />
        </TabsContent>
        <TabsContent value="templates" className="mt-5">
          <TemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
