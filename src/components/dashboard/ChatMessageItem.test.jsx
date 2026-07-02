import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatMessageItem from './ChatMessageItem.jsx'

const noop = () => {}
const fmt = (v) => `@${v}`

function renderItem(msg, props = {}) {
  return render(
    <ChatMessageItem
      msg={msg}
      currentUserId={1}
      formatTime={fmt}
      onReactMessage={props.onReactMessage || noop}
      onReplyMessage={props.onReplyMessage || noop}
      {...props}
    />
  )
}

describe('ChatMessageItem', () => {
  it('renders null when msg is null', () => {
    const { container } = renderItem(null)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a text message with author and formatted time', () => {
    renderItem({
      id: 10,
      sender_id: 2,
      sender_name: 'Alice',
      content: 'hello world',
      created_at: '2025-01-01T10:00:00',
    })
    expect(screen.getByText('hello world')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('@2025-01-01T10:00:00')).toBeInTheDocument()
  })

  it('renders a day-divider system message as the date pill', () => {
    renderItem({ id: 1, message_type: 'system', content: '--- 2025-12-18 ---' })
    expect(screen.getByText('2025-12-18')).toBeInTheDocument()
  })

  it('renders image thumbnails and opens/closes the preview modal', () => {
    renderItem({
      id: 3,
      sender_id: 2,
      sender_name: 'Bob',
      message_type: 'image',
      image_urls: ['https://cdn.x/pic.png'],
    })
    const thumb = screen.getByAltText('chat-image-0')
    expect(thumb).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Click to preview'))
    expect(screen.getByAltText('preview')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Close'))
    expect(screen.queryByAltText('preview')).not.toBeInTheDocument()
  })

  it('closes the preview modal on Escape', () => {
    renderItem({
      id: 3,
      sender_id: 2,
      message_type: 'image',
      image_urls: ['https://cdn.x/pic.png'],
    })
    fireEvent.click(screen.getByTitle('Click to preview'))
    expect(screen.getByAltText('preview')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByAltText('preview')).not.toBeInTheDocument()
  })

  it('renders reaction pills and emits the reaction key on click', () => {
    const onReactMessage = vi.fn()
    renderItem(
      {
        id: 5,
        sender_id: 2,
        content: 'x',
        reactions: [{ reaction: 'like', count: 3, reacted_by_me: false }],
      },
      { onReactMessage }
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('👍')).toBeInTheDocument()

    fireEvent.click(screen.getByText('👍').closest('button'))
    expect(onReactMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 5, reaction: 'like', emoji: '👍' })
    )
  })

  it('renders a reply preview when the message replies to another', () => {
    renderItem({
      id: 6,
      sender_id: 2,
      content: 'a reply',
      reply: { message_id: 4, sender_name: 'Carol', preview: 'original text' },
    })
    expect(screen.getByText('Carol')).toBeInTheDocument()
    expect(screen.getByText('original text')).toBeInTheDocument()
  })

  it('opens a context menu on right-click and emits reply', () => {
    const onReplyMessage = vi.fn()
    renderItem(
      { id: 7, sender_id: 2, content: 'ctx target' },
      { onReplyMessage }
    )
    fireEvent.contextMenu(screen.getByText('ctx target'))

    const replyBtn = screen.getByTitle('Reply')
    expect(replyBtn).toBeInTheDocument()
    fireEvent.click(replyBtn)
    expect(onReplyMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 7 })
    )
  })

  it('emits a quick reaction from the context menu', () => {
    const onReactMessage = vi.fn()
    renderItem({ id: 8, sender_id: 2, content: 'x' }, { onReactMessage })
    fireEvent.contextMenu(screen.getByText('x'))

    // The quick-react row offers ❤️ among others
    const loveBtn = screen.getByTitle('React ❤️')
    fireEvent.click(loveBtn)
    expect(onReactMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 8, reaction: 'love', emoji: '❤️' })
    )
  })

  it('shows the seen row only for my latest message with seen users', () => {
    renderItem(
      { id: 9, sender_id: 1, content: 'mine' },
      {
        isLatestMyMessage: true,
        seenUsers: [
          { user_id: 2, full_name: 'Zoe', last_seen_message_id: 9 },
        ],
      }
    )
    // seen row title reflects the count
    expect(screen.getByTitle('1 seen')).toBeInTheDocument()
  })
})
