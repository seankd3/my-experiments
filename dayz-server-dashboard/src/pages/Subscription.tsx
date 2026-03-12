import React from 'react';
import {
  CreditCard,
  Check,
  X,
  Crown,
  Zap,
  Shield,
  Star,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import {
  useSubscriptionTiers,
  useCurrentSubscription,
  useSubscribe,
  useCancelSubscription,
} from '../api/hooks';
import { useToastStore } from '../store/toastStore';

const tierIcons: Record<string, React.ReactNode> = {
  Free: <Shield className="w-6 h-6 text-gray-400" />,
  Starter: <Zap className="w-6 h-6 text-blue-400" />,
  Pro: <Star className="w-6 h-6 text-accent-400" />,
  Enterprise: <Crown className="w-6 h-6 text-purple-400" />,
};

const tierColors: Record<string, string> = {
  Free: 'border-gray-600/50',
  Starter: 'border-blue-600/50',
  Pro: 'border-accent-600/50 ring-1 ring-accent-600/20',
  Enterprise: 'border-purple-600/50',
};

const tierBg: Record<string, string> = {
  Free: '',
  Starter: '',
  Pro: 'bg-gradient-to-b from-accent-900/10 to-transparent',
  Enterprise: '',
};

// Default tiers if API is not available
const defaultTiers = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'monthly' as const,
    maxServers: 1,
    features: [
      'Basic server management',
      '1 server connection',
      'Chat monitoring',
      'Basic player list',
      'Community support',
    ],
    isActive: true,
    sortOrder: 0,
    description: 'Get started with basic server management',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    interval: 'monthly' as const,
    maxServers: 3,
    features: [
      'Everything in Free',
      '3 server connections',
      'Task automation',
      'Player management',
      'Kick/Ban controls',
      'Scheduled messages',
      'Email support',
    ],
    isActive: true,
    sortOrder: 1,
    description: 'Perfect for small communities',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 24.99,
    interval: 'monthly' as const,
    maxServers: 10,
    features: [
      'Everything in Starter',
      '10 server connections',
      'Interactive map view',
      'Player teleport & heal',
      'Advanced analytics',
      'API access',
      'Player position tracking',
      'Priority support',
    ],
    isActive: true,
    sortOrder: 2,
    description: 'For serious server admins',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49.99,
    interval: 'monthly' as const,
    maxServers: -1,
    features: [
      'Everything in Pro',
      'Unlimited servers',
      'Custom integrations',
      'Webhook notifications',
      'White-label options',
      'Dedicated account manager',
      'SLA guarantee',
      '24/7 priority support',
    ],
    isActive: true,
    sortOrder: 3,
    description: 'For large networks and organizations',
  },
];

export default function Subscription() {
  const { data: tiers } = useSubscriptionTiers();
  const { data: currentSub } = useCurrentSubscription();
  const subscribe = useSubscribe();
  const cancelSub = useCancelSubscription();
  const { addToast } = useToastStore();
  const [showCancelModal, setShowCancelModal] = React.useState(false);

  const displayTiers = tiers || defaultTiers;

  const handleSubscribe = (tierId: string) => {
    subscribe.mutate(tierId, {
      onSuccess: (data) => {
        if (data?.url) {
          window.location.href = data.url;
        } else {
          addToast('success', 'Subscription updated!');
        }
      },
      onError: () => addToast('error', 'Failed to process subscription'),
    });
  };

  const handleCancel = () => {
    cancelSub.mutate(undefined, {
      onSuccess: () => {
        addToast('success', 'Subscription cancelled');
        setShowCancelModal(false);
      },
      onError: () => addToast('error', 'Failed to cancel subscription'),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your plan and billing
        </p>
      </div>

      {/* Current Plan */}
      {currentSub && (
        <Card glow>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {tierIcons[currentSub.tierName] || (
                  <CreditCard className="w-6 h-6 text-primary-400" />
                )}
                <div>
                  <h2 className="text-lg font-bold text-gray-100">
                    {currentSub.tierName} Plan
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={
                        currentSub.status === 'active'
                          ? 'success'
                          : currentSub.status === 'trialing'
                          ? 'info'
                          : 'warning'
                      }
                      dot
                    >
                      {currentSub.status}
                    </Badge>
                    {currentSub.cancelAtPeriodEnd && (
                      <Badge variant="warning">Cancels at period end</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Current period</p>
                <p className="text-sm text-gray-300">
                  {new Date(currentSub.currentPeriodStart).toLocaleDateString()}{' '}
                  - {new Date(currentSub.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayTiers.map((tier) => {
          const isCurrent = currentSub?.tierId === tier.id;
          return (
            <Card
              key={tier.id}
              className={`relative ${tierColors[tier.name] || ''} ${tierBg[tier.name] || ''}`}
            >
              {tier.name === 'Pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="accent" size="md">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardBody className="space-y-4 pt-6">
                <div className="text-center">
                  {tierIcons[tier.name] || (
                    <CreditCard className="w-6 h-6 text-gray-400 mx-auto" />
                  )}
                  <h3 className="text-lg font-bold text-gray-100 mt-2">
                    {tier.name}
                  </h3>
                  {tier.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {tier.description}
                    </p>
                  )}
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-gray-100 font-mono">
                      ${tier.price}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-sm text-gray-500">/mo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {tier.maxServers === -1
                      ? 'Unlimited servers'
                      : `Up to ${tier.maxServers} server${tier.maxServers > 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
              <CardFooter>
                {isCurrent ? (
                  <div className="w-full text-center">
                    <Badge variant="success" size="md">
                      Current Plan
                    </Badge>
                    {tier.price > 0 && !currentSub?.cancelAtPeriodEnd && (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="block w-full mt-2 text-xs text-gray-500 hover:text-danger-400 transition-colors"
                      >
                        Cancel subscription
                      </button>
                    )}
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    variant={tier.name === 'Pro' ? 'accent' : 'secondary'}
                    onClick={() => handleSubscribe(tier.id)}
                    loading={subscribe.isPending}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    {tier.price === 0
                      ? 'Downgrade to Free'
                      : currentSub && tier.price > 0
                      ? 'Switch Plan'
                      : 'Get Started'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancelModal(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={cancelSub.isPending}
            >
              Cancel Subscription
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-danger-900/20 border border-danger-700/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-danger-400 flex-shrink-0" />
            <p className="text-sm text-danger-300">
              Your subscription will remain active until the end of the current
              billing period. After that, you will be downgraded to the Free plan.
            </p>
          </div>
          <p className="text-sm text-gray-400">
            You will lose access to premium features including advanced analytics,
            interactive map, and automation tools.
          </p>
        </div>
      </Modal>
    </div>
  );
}
